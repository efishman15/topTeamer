﻿angular.module("topTeamer.controllers", ["topTeamer.services", "ngAnimate"])

    .controller("AppCtrl", function ($scope, $rootScope, $state, XpService, $ionicSideMenuDelegate, PopupService, SoundService, $ionicModal, ScreenService, ShareService, HostedGamesService) {

        $scope.gameCategories = null;

        $rootScope.$on("topTeamer-directionChanged", function () {
            $scope.canvas.className = "menu-xp-" + $rootScope.settings.languages[$rootScope.user.settings.language].direction;
        });

        $scope.$on("topTeamer-windowResize", function () {
            ScreenService.resizeCanvas();
        });

        $scope.$on("topTeamer-orientationChanged", function () {
            ScreenService.resizeCanvas();
        });

        ScreenService.resizeCanvas();

        //-------------------------------------------------------
        //Loading modal dialogs
        //-------------------------------------------------------

        //-------------------------------------------------------
        // New rank modal form
        //-------------------------------------------------------
        $ionicModal.fromTemplateUrl("templates/newRank.html", function (newRankModal) {
            $scope.newRankModal = newRankModal;
        }, {
            scope: $scope,
            animation: "slide-in-up"
        });

        $scope.openNewRankModal = function () {
            FlurryAgent.logEvent("newRank", {"rank": "" + $rootScope.session.rank});
            $scope.newRankModal.show();
        };

        $scope.closeNewRankModal = function () {
            $scope.newRankModal.hide();
        };

        $rootScope.$on("topTeamer-rankChanged", function (event, data) {

            SoundService.play("audio/finish_great_1");
            $scope.xpProgress = data.xpProgress;
            $scope.callbackAfterModal = data.callback;

            $scope.openNewRankModal();

        });

        $scope.$on("modal.hidden", function (event, viewData) {
            if ($scope.callbackAfterModal) {
                $scope.callbackAfterModal();
            }
        });

        //-------------------------------------------------------
        // contest Type modal form
        //-------------------------------------------------------
        $ionicModal.fromTemplateUrl("templates/contestType.html", function (contestTypeModal) {
            $scope.contestTypeModal = contestTypeModal;
        }, {
            scope: $scope,
            animation: "slide-in-up"
        });

        $scope.openContestTypeModal = function () {
            FlurryAgent.logEvent("selectContestContent");
            if (!$scope.gameCategories) {
                HostedGamesService.getCategories(function (categories) {
                    $scope.gameCategories = categories;
                    $scope.contestTypeModal.show();
                });
            }
            else {
                $scope.contestTypeModal.show();
            }
        };

        $scope.closeContestTypeModal = function () {
            $scope.contestTypeModal.hide();
        };

        //Hardware back button handlers
        $state.current.data.contestType.isOpenHandler = function () {
            return $scope.contestTypeModal.isShown()
        };
        $state.current.data.contestType.closeHandler = $scope.closeContestTypeModal;

        $scope.canvas = document.createElement("canvas");
        $scope.canvas.width = $rootScope.settings.xpControl.canvas.width;
        $scope.canvas.height = $rootScope.settings.xpControl.canvas.height;

        $scope.context = $scope.canvas.getContext("2d");

        angular.element(document.querySelector("#canvasWrapper")).append($scope.canvas);

        if ($rootScope.session) {
            XpService.initXp($scope.canvas, $scope.context);
        }

        $scope.$watch(function () {
            return $ionicSideMenuDelegate.isOpen();
        }, function (value) {
            if (!value) {
                $scope.canvas.className = "menu-xp-" + $rootScope.settings.languages[$rootScope.user.settings.language].direction;
            }
            else {
                FlurryAgent.logEvent("menu/open")
                $scope.canvas.className = "menu-xp-menu-open";
            }
        });

        $scope.share = function (contest) {
            if ($rootScope.user.clientInfo.mobile) {
                ShareService.mobileShare(contest);
            }
            else {
                $rootScope.gotoView("app.share", false, {"contest": contest});
            }
        };

        $scope.selectContestContent = function (content) {
            $scope.closeContestTypeModal();
            $rootScope.gotoView("app.setContest", false, {
                "mode": "add",
                "contentCategoryId": content.category.id,
                "content": content
            });
        };
    })

    .controller("HomeCtrl", function ($scope, $rootScope, $state, UserService, PopupService, $ionicHistory, $ionicPopup, $translate, ScreenService, StoreService) {

        ScreenService.resizeCanvas();

        $scope.$on("topTeamer-windowResize", function () {
            ScreenService.resizeCanvas();
        });

        $scope.$on("topTeamer-orientationChanged", function () {
            ScreenService.resizeCanvas();
        });

        $scope.$on("$ionicView.beforeEnter", function () {

            if ($rootScope.session) {
                $rootScope.gotoRootView();
            }
            else if (!$rootScope.user) {
                UserService.initUser();
            }
        });

        $scope.$on("$ionicView.afterEnter", function (event, viewData) {
            //Might have popups waiting to be shown such as must update popup etc.
            UserService.resolveEvents();
        });

        $scope.changeLanguage = function (language) {
            $rootScope.user.settings.language = language.value;
            StoreService.setLanguage(language.value);
            $translate.use(language.value);
        };

        $scope.facebookConnect = function () {
            UserService.facebookClientConnect(function (session) {
                $rootScope.gotoRootView();
            })
        };
    })

    .controller("ContestsCtrl", function ($scope, $state, $stateParams, $rootScope, $ionicHistory, $translate, ContestsService, PopupService, $timeout, $ionicTabsDelegate, UserService, $ionicConfig) {

        var tabs = ["app.tabs.myContests", "app.tabs.runningContests", "app.tabs.recentlyFinishedContests"];

        $scope.roundTabState = [true, false, false];

        $scope.$on("$ionicView.afterEnter", function (event, viewData) {
            //Might have popups waiting to be shown such as must update popup etc.
            UserService.resolveEvents();
        });

        $scope.$on("$ionicView.beforeEnter", function (event, viewData) {

            if (!$rootScope.session) {
                $rootScope.gotoView("home");
                return;
            }

            if ($rootScope.deepLinkContestId) {
                var contestId = $rootScope.deepLinkContestId;
                $rootScope.deepLinkContestId = null;
                $rootScope.gotoView("app.contest", false, {id: contestId});
                return;
            }

            $scope.userClick = $stateParams.userClick;

            $scope.tab = $state.current.data.serverTab;
            $scope.title = $state.current.data.title;

            viewData.enableBack = false;

            $scope.roundTabState[0] = true;

            $scope.loadContests()
        });

        $scope.roundTabSwitch = function (viewName) {
            $scope.roundTabState[0] = false;
            $rootScope.gotoView(viewName, false, {}, false, true);
        };

        $scope.$on("topTeamer-tabChanged", function () {
            $rootScope.gotoView(tabs[$ionicTabsDelegate.selectedIndex()], true, {userClick: true});
        });

        $scope.loadContests = function (fromScroll) {

            ContestsService.getContests($state.current.data.serverTab, function (contestsResult) {

                if (!$scope.userClick && $ionicTabsDelegate.selectedIndex() === 0) {
                    //If no "my contests" - switch to running contests
                    $rootScope.gotoView(tabs[1]);
                    return;
                }

                $scope.contestCharts = [];

                //Add server contests to the end of the array
                for (var i = 0; i < contestsResult.list.length; i++) {
                    var contestChart = ContestsService.prepareContestChart(contestsResult.list[i], "ends");
                    $scope.contestCharts.push(contestChart);
                }

                if (fromScroll) {
                    $scope.$broadcast("scroll.refreshComplete");
                }
            });
        }

        $rootScope.$on("topTeamer-contestCreated", function (event, contest) {
            $rootScope.deepLinkContestId = contest._id;
            $rootScope.contestJustCreated = contest;
        });

        $scope.fcEvents = {
            "chartClick": function (eventObj, dataObj) {
                $scope.gotoContest(eventObj.sender.args.dataSource.contest._id, eventObj.sender.args.dataSource.contest);
            }
        }

        $scope.gotoContest = function (id, contest) {
            $rootScope.gotoView("app.contest", false, {"id": id});
            $rootScope.$broadcast("topTeamer-contestUpdated", contest);
        }
    })

    .controller("QuizCtrl", function ($scope, $rootScope, $state, $stateParams, UserService, QuizService, PopupService, $ionicHistory, $translate, $timeout, SoundService, XpService, $ionicModal, $ionicConfig) {

        var quizCanvas;
        var quizContext;
        if (!quizCanvas) {
            quizCanvas = document.getElementById("quizCanvas");
            quizContext = quizCanvas.getContext("2d");
            quizContext.font = $rootScope.settings.quiz.canvas.font;
        }

        //-------------------------------------------------------
        // Question stats Popover
        //-------------------------------------------------------
        $ionicModal.fromTemplateUrl("templates/questionInfo.html", {
            scope: $scope,
            animation: "slide-in-up"
        }).then(function (questionInfoModal) {
            $scope.questionInfoModal = questionInfoModal;
        });

        $scope.openQuestionInfoModal = function () {
            if ($state.current.data && $state.current.data.questionInfo) {
                $state.current.data.questionInfo.open = true;
            }
            FlurryAgent.logEvent("quiz/showQuestionInfo", {"question": "" + ($scope.quiz.currentQuestionIndex + 1)});
            $scope.questionInfoModal.show();
        };

        $scope.closeQuestionInfoModal = function () {
            $scope.questionInfoModal.hide();
        };

        //-------------------------------------------------------
        // Question modal
        // -------------------------------------------------------
        $ionicModal.fromTemplateUrl("templates/question.html", function (questionModal) {
            $scope.questionModal = questionModal;
        }, {
            scope: $scope,
            animation: "slide-in-up"
        });

        $scope.openQuestionModal = function () {

            $scope.questionModalTitle = $translate.instant("EDIT_QUESTION");

            $scope.question = {
                "_id": $scope.quiz.currentQuestion._id,
                "text": $scope.quiz.currentQuestion.text,
                "answers": []
            };

            for (var i = 0; i < $scope.quiz.currentQuestion.answers.length; i++) {
                $scope.question.answers[$scope.quiz.currentQuestion.answers[i].originalIndex] = $scope.quiz.currentQuestion.answers[i].text;
            }

            $scope.questionForm.$setPristine();
            $scope.questionForm.$setUntouched();
            $scope.questionModal.show();
        };

        $scope.closeQuestionModal = function (questionSet) {

            if (!questionSet) {
                $scope.questionModal.hide();
                return;
            }

            QuizService.setQuestionByAdmin($scope.question, function (result) {
                $scope.quiz.currentQuestion.text = $scope.question.text;
                for (var i = 0; i < $scope.question.answers.length; i++) {
                    $scope.quiz.currentQuestion.answers[i].text = $scope.question.answers[$scope.quiz.currentQuestion.answers[i].originalIndex];
                }
                $scope.questionModal.hide();
            })
        };

        //Hardware back button handlers
        $state.current.data.questionInfo.isOpenHandler = function () {
            return $scope.questionInfoModal.isShown()
        };
        $state.current.data.questionInfo.closeHandler = $scope.closeQuestionInfoModal;

        //Cleanup the modal when we're done with it!
        $scope.$on("$destroy", function () {
            if ($scope.questionInfoModal) {
                $scope.questionInfoModal.remove();
            }
        });

        $scope.canvasClick = function (event) {
            if ($scope.currentQuestionCircle &&
                event.offsetX <= $scope.currentQuestionCircle.right &&
                event.offsetX >= $scope.currentQuestionCircle.left &&
                event.offsetY >= $scope.currentQuestionCircle.top &&
                event.offsetY <= $scope.currentQuestionCircle.bottom) {

                if ($scope.quiz.currentQuestion.correctRatio || $scope.quiz.currentQuestion.correctRatio == 0) {
                    $scope.questionChart = JSON.parse(JSON.stringify($rootScope.settings.charts.questionStats));

                    $scope.questionChart.chart.caption = $translate.instant("QUESTION_STATS_CHART_CAPTION");

                    $scope.questionChart.chart.paletteColors = $rootScope.settings.quiz.canvas.correctRatioColor + "," + $rootScope.settings.quiz.canvas.incorrectRatioColor;

                    $scope.questionChart.data = [];
                    $scope.questionChart.data.push({
                        "label": $translate.instant("ANSWERED_CORRECT"),
                        "value": $scope.quiz.currentQuestion.correctRatio
                    });
                    $scope.questionChart.data.push({
                        "label": $translate.instant("ANSWERED_INCORRECT"),
                        "value": (1 - $scope.quiz.currentQuestion.correctRatio)
                    });
                }

                $scope.openQuestionInfoModal(event);
            }
        };

        //Hash map - each item's key is the img.src and the value is an object like this:
        // loaded: true/false
        // drawRequests: array of drawRequest objects that each contain:
        //img, x, y, width, height
        var drawImageQueue = {};

        function initDrawImageQueue(src) {

            var img = document.createElement("img");
            drawImageQueue[src] = {"img": img, "loaded": false, "drawRequests": []};

            img.onload = function () {
                processDrawImageRequests(src);
            }
            img.src = src;
        }

        function drawImageAsync(imgSrc, x, y, width, height) {

            //If image loaded - draw right away
            if (drawImageQueue[imgSrc].loaded) {
                quizContext.drawImage(drawImageQueue[imgSrc].img, x, y, width, height);
                return;
            }

            var drawRequest = {
                "x": x,
                "y": y,
                "width": width,
                "height": height
            }

            //Add request to queue
            drawImageQueue[imgSrc].drawRequests.push(drawRequest);
        }

        function processDrawImageRequests(imgSrc) {

            drawImageQueue[imgSrc].loaded = true;
            while (drawImageQueue[imgSrc].drawRequests.length > 0) {
                var drawRequest = drawImageQueue[imgSrc].drawRequests.pop();
                quizContext.drawImage(drawImageQueue[imgSrc].img, drawRequest.x, drawRequest.y, drawRequest.width, drawRequest.height);
            }
        }

        var imgCorrectSrc = "images/correct.png";
        var imgErrorSrc = "images/error.png";
        var imgQuestionInfoSrc = "images/info_question.png";

        initDrawImageQueue(imgCorrectSrc);
        initDrawImageQueue(imgErrorSrc);
        initDrawImageQueue(imgQuestionInfoSrc);

        $scope.$on("$ionicView.beforeEnter", function (event, viewData) {

            $ionicConfig.backButton.previousTitleText("");
            $ionicConfig.backButton.text("");

            viewData.enableBack = true;

            startQuiz();
        });

        $scope.$on("topTeamer-windowResize", function () {
            drawQuizProgress();
        });

        function drawQuizProgress() {

            quizCanvas.width = quizCanvas.clientWidth;

            quizContext.beginPath();
            quizContext.moveTo(0, $rootScope.settings.quiz.canvas.radius + $rootScope.settings.quiz.canvas.topOffset);
            quizContext.lineTo(quizCanvas.width, $rootScope.settings.quiz.canvas.radius + $rootScope.settings.quiz.canvas.topOffset);
            quizContext.lineWidth = $rootScope.settings.quiz.canvas.lineWidth;

            // set line color
            quizContext.strokeStyle = $rootScope.settings.quiz.canvas.inactiveColor
            quizContext.stroke();
            quizContext.fill();
            quizContext.closePath();

            var currentX;
            if ($rootScope.settings.languages[$rootScope.user.settings.language].direction === "ltr") {
                currentX = $rootScope.settings.quiz.canvas.radius;
            }
            else {
                currentX = quizCanvas.width - $rootScope.settings.quiz.canvas.radius;
            }

            $scope.currentQuestionCircle = null;
            var circleOffsets = (quizCanvas.width - $scope.quiz.totalQuestions * $rootScope.settings.quiz.canvas.radius * 2) / ($scope.quiz.totalQuestions - 1);

            for (var i = 0; i < $scope.quiz.totalQuestions; i++) {

                if (i === $scope.quiz.currentQuestionIndex) {

                    //Question has no statistics about success ratio
                    quizContext.beginPath();
                    quizContext.fillStyle = $rootScope.settings.quiz.canvas.activeColor;
                    quizContext.arc(currentX, $rootScope.settings.quiz.canvas.radius + $rootScope.settings.quiz.canvas.topOffset, $rootScope.settings.quiz.canvas.radius, 0, Math.PI * 2, false);
                    quizContext.fill();
                    quizContext.closePath();

                    $scope.currentQuestionCircle = {
                        "top": $rootScope.settings.quiz.canvas.topOffset,
                        "left": currentX - $rootScope.settings.quiz.canvas.radius,
                        "bottom": $rootScope.settings.quiz.canvas.topOffset + 2 * $rootScope.settings.quiz.canvas.radius,
                        "right": currentX + $rootScope.settings.quiz.canvas.radius
                    };

                    //Current question has statistics about success ratio
                    if ($scope.quiz.currentQuestion.correctRatio || $scope.quiz.currentQuestion.correctRatio == 0) {

                        //Draw the correct ratio
                        if ($scope.quiz.currentQuestion.correctRatio > 0) {
                            quizContext.beginPath();
                            quizContext.moveTo(currentX, $rootScope.settings.quiz.canvas.radius + $rootScope.settings.quiz.canvas.topOffset);
                            quizContext.fillStyle = $rootScope.settings.quiz.canvas.correctRatioColor;
                            quizContext.arc(currentX, $rootScope.settings.quiz.canvas.radius + $rootScope.settings.quiz.canvas.topOffset, $rootScope.settings.quiz.canvas.pieChartRadius, 0, -$scope.quiz.currentQuestion.correctRatio * Math.PI * 2, true);
                            quizContext.fill();
                            quizContext.closePath();
                        }

                        //Draw the incorrect ratio
                        if ($scope.quiz.currentQuestion.correctRatio < 1) {
                            quizContext.beginPath();
                            quizContext.moveTo(currentX, $rootScope.settings.quiz.canvas.radius + $rootScope.settings.quiz.canvas.topOffset);
                            quizContext.fillStyle = $rootScope.settings.quiz.canvas.incorrectRatioColor;
                            quizContext.arc(currentX, $rootScope.settings.quiz.canvas.radius + $rootScope.settings.quiz.canvas.topOffset, $rootScope.settings.quiz.canvas.pieChartRadius, -$scope.quiz.currentQuestion.correctRatio * Math.PI * 2, Math.PI * 2, true);
                            quizContext.fill();
                            quizContext.closePath();
                        }
                    }
                    else {
                        //Question has no stats - draw an info icon inside to make user press
                        drawImageAsync(imgQuestionInfoSrc, currentX - $rootScope.settings.quiz.canvas.pieChartRadius, $rootScope.settings.quiz.canvas.topOffset + $rootScope.settings.quiz.canvas.radius - $rootScope.settings.quiz.canvas.pieChartRadius, $rootScope.settings.quiz.canvas.pieChartRadius * 2, $rootScope.settings.quiz.canvas.pieChartRadius * 2);
                    }
                }
                else {
                    quizContext.beginPath();
                    quizContext.fillStyle = $rootScope.settings.quiz.canvas.inactiveColor;
                    quizContext.arc(currentX, $rootScope.settings.quiz.canvas.radius + $rootScope.settings.quiz.canvas.topOffset, $rootScope.settings.quiz.canvas.radius, 0, Math.PI * 2, false);
                    quizContext.fill();
                    quizContext.closePath();

                }

                //Draw correct/incorrect for answered
                if ($scope.questionHistory[i].answer != null) {
                    if ($scope.questionHistory[i].answer) {
                        drawImageAsync(imgCorrectSrc, currentX - $rootScope.settings.quiz.canvas.radius, $rootScope.settings.quiz.canvas.topOffset, $rootScope.settings.quiz.canvas.radius * 2, $rootScope.settings.quiz.canvas.radius * 2);
                    }
                    else {
                        drawImageAsync(imgErrorSrc, currentX - $rootScope.settings.quiz.canvas.radius, $rootScope.settings.quiz.canvas.topOffset, $rootScope.settings.quiz.canvas.radius * 2, $rootScope.settings.quiz.canvas.radius * 2);
                    }
                }

                if ($rootScope.settings.languages[$rootScope.user.settings.language].direction === "ltr") {
                    if (i < $scope.quiz.totalQuestions - 1) {
                        currentX += circleOffsets + $rootScope.settings.quiz.canvas.radius * 2;
                    }
                    else {
                        currentX = quizCanvas.width - $rootScope.settings.quiz.canvas.radius;
                    }
                }
                else {
                    if (i < $scope.quiz.totalQuestions - 1) {
                        currentX = currentX - circleOffsets - ($rootScope.settings.quiz.canvas.radius * 2);
                    }
                    else {
                        currentX = $rootScope.settings.quiz.canvas.radius;
                    }
                }
            }

            drawQuizScores();

        };

        function clearQuizScores() {
            quizContext.beginPath();
            quizContext.clearRect(0, 0, quizCanvas.width, $rootScope.settings.quiz.canvas.scores.top);
            quizContext.closePath();
        }

        function drawQuizScores() {

            clearQuizScores();

            var currentX;
            if ($rootScope.settings.languages[$rootScope.user.settings.language].direction === "ltr") {
                currentX = $rootScope.settings.quiz.canvas.radius;
            }
            else {
                currentX = quizCanvas.width - $rootScope.settings.quiz.canvas.radius;
            }

            var circleOffsets = (quizCanvas.width - $scope.quiz.totalQuestions * $rootScope.settings.quiz.canvas.radius * 2) / ($scope.quiz.totalQuestions - 1);
            for (var i = 0; i < $scope.quiz.totalQuestions; i++) {

                var questionScore;
                if (!$scope.quiz.reviewMode) {
                    questionScore = "" + $scope.questionHistory[i].score;
                }
                else {
                    questionScore = "";
                }

                //Draw question score
                var textWidth = quizContext.measureText(questionScore).width;
                var scoreColor = $rootScope.settings.quiz.canvas.inactiveColor;

                if ($scope.questionHistory[i].answer && !$scope.questionHistory[i].answerUsed) {
                    scoreColor = $rootScope.settings.quiz.canvas.correctRatioColor;
                }

                //Draw the score at the top of the circle
                quizContext.beginPath();
                quizContext.fillStyle = scoreColor;
                quizContext.fillText(questionScore, currentX + textWidth / 2, $rootScope.settings.quiz.canvas.scores.top);
                quizContext.closePath();

                if ($rootScope.settings.languages[$rootScope.user.settings.language].direction === "ltr") {
                    if (i < $scope.quiz.totalQuestions - 1) {
                        currentX += circleOffsets + $rootScope.settings.quiz.canvas.radius * 2;
                    }
                    else {
                        currentX = quizCanvas.width - $rootScope.settings.quiz.canvas.radius;
                    }
                }
                else {
                    if (i < $scope.quiz.totalQuestions - 1) {
                        currentX = currentX - circleOffsets - ($rootScope.settings.quiz.canvas.radius * 2);
                    }
                    else {
                        currentX = $rootScope.settings.quiz.canvas.radius;
                    }
                }
            }
        };

        function startQuiz() {

            if (!$stateParams.contestId) {
                $rootScope.gotoRootView();
                return;
            }

            QuizService.start($stateParams.contestId,
                function (data) {
                    FlurryAgent.logEvent("quiz/started");
                    $scope.quiz = data.quiz;
                    $scope.questionHistory = [];
                    for (var i = 0; i < data.quiz.totalQuestions; i++) {
                        $scope.questionHistory.push({"score": $rootScope.settings.quiz.questions.score[i]});
                    }
                    drawQuizProgress();

                    $scope.quiz.currentQuestion.answered = false;

                    if ($scope.quiz.reviewMode && $scope.quiz.reviewMode.reason) {
                        PopupService.alert($translate.instant($scope.quiz.reviewMode.reason));
                    }
                });
        }

        $scope.nextQuestion = function () {
            QuizService.nextQuestion(function (data) {
                $scope.quiz = data;
                $scope.quiz.currentQuestion.answered = false;
                $scope.quiz.currentQuestion.doAnimation = true; //Animation end will trigger quiz proceed
                drawQuizProgress();
                FlurryAgent.logEvent("quiz/gotQuestion" + ($scope.quiz.currentQuestionIndex + 1));
            });
        }

        $scope.questionTransitionEnd = function () {
            if ($scope.quiz && $scope.quiz.currentQuestion) {
                $scope.quiz.currentQuestion.doAnimation = false; //Animation end will trigger quiz proceed
            }
        }

        $scope.buttonAnimationEnded = function (button, event) {

            if ($scope.quiz.xpProgress && $scope.quiz.xpProgress.addition > 0) {
                XpService.addXp($scope.quiz.xpProgress, $scope.quizProceed);
            }

            if ($scope.correctButtonId === button.id && (!$scope.quiz.xpProgress || !$scope.quiz.xpProgress.rankChanged)) {
                $scope.quizProceed();
            }
        };

        $scope.quizProceed = function () {
            if ($scope.quiz.finished) {
                drawQuizProgress();
                $rootScope.session.score += $scope.quiz.results.data.score;

                FlurryAgent.logEvent("quiz/finished",
                    {
                        "score": "" + $scope.quiz.results.data.score,
                        "title": $scope.quiz.results.data.title,
                        "message": $scope.quiz.results.data.message
                    });

                $ionicHistory.goBack();
                $rootScope.$broadcast("topTeamer-quizFinished", $scope.quiz.results);

            }
            else {
                $scope.nextQuestion();
            }
        }

        $scope.submitAnswer = function (answerId) {
            $scope.quiz.currentQuestion.answered = true;

            var config = {
                "onServerErrors": {
                    "SERVER_ERROR_SESSION_EXPIRED_DURING_QUIZ": {"next": startQuiz},
                    "SERVER_ERROR_GENERAL": {
                        "next": function () {
                            $rootScope.goBack();
                        }
                    }
                }
            };

            QuizService.answer(answerId, $scope.questionHistory[$scope.quiz.currentQuestionIndex].hintUsed, $scope.questionHistory[$scope.quiz.currentQuestionIndex].answerUsed,
                function (data) {
                    var correctAnswerId;

                    $scope.questionHistory[$scope.quiz.currentQuestionIndex].answer = data.question.correct;

                    if (data.results) {
                        //Will get here when quiz is finished
                        $scope.quiz.results = data.results;
                    }

                    //Rank might change during quiz - and feature might open
                    if (data.features) {
                        $rootScope.session.features = data.features;
                    }

                    if (data.xpProgress) {
                        $scope.quiz.xpProgress = data.xpProgress;
                    }
                    else {
                        $scope.quiz.xpProgress = null;
                    }

                    if (data.question.correct) {

                        FlurryAgent.logEvent("quiz/question" + ($scope.quiz.currentQuestionIndex + 1) + "/answered/correct");

                        correctAnswerId = answerId;
                        $scope.quiz.currentQuestion.answers[answerId].answeredCorrectly = true;
                        SoundService.play("audio/click_ok");
                    }
                    else {
                        FlurryAgent.logEvent("quiz/question" + ($scope.quiz.currentQuestionIndex + 1) + "/answered/incorrect");
                        SoundService.play("audio/click_wrong");
                        correctAnswerId = data.question.correctAnswerId;
                        $scope.quiz.currentQuestion.answers[answerId].answeredCorrectly = false;
                        $timeout(function () {
                            $scope.$apply(function () {
                                $scope.quiz.currentQuestion.answers[data.question.correctAnswerId].correct = true;
                            })
                        }, 3000);
                    }

                    $scope.correctButtonId = "buttonAnswer" + correctAnswerId;
                }, null, config
            );
        }

        $scope.assistWithHint = function () {
            $scope.questionHistory[$scope.quiz.currentQuestionIndex].hintUsed = true;
            $scope.questionHistory[$scope.quiz.currentQuestionIndex].score = $rootScope.settings.quiz.questions.score[$scope.quiz.currentQuestionIndex] - $scope.quiz.currentQuestion.hintCost;
            drawQuizScores();
            $scope.closeQuestionInfoModal();
            window.open($rootScope.settings.languages[$rootScope.user.settings.language].wiki + $scope.quiz.currentQuestion.wikipediaHint, "_system", "location=yes");
        };

        $scope.assistWithAnswer = function () {
            $scope.questionHistory[$scope.quiz.currentQuestionIndex].answerUsed = true;
            $scope.questionHistory[$scope.quiz.currentQuestionIndex].score = $rootScope.settings.quiz.questions.score[$scope.quiz.currentQuestionIndex] - $scope.quiz.currentQuestion.answerCost;
            drawQuizScores();
            $scope.closeQuestionInfoModal();
            window.open($rootScope.settings.languages[$rootScope.user.settings.language].wiki + $scope.quiz.currentQuestion.wikipediaAnswer, "_system", "location=yes");
        };
    })

    .controller("LogoutCtrl", function ($scope, $rootScope, $state, UserService, PopupService, $ionicHistory, $translate) {

        $scope.$on("$ionicView.beforeEnter", function () {
            var language = $rootScope.user.settings.language;
            UserService.logout(function () {
                if (language !== $rootScope.user.settings.language) {
                    $translate.use($rootScope.user.settings.language);
                    StoreService.setLanguage($rootScope.user.settings.language);
                }
                $rootScope.gotoView("home");
            });
        });
    })

    .controller("SettingsCtrl", function ($scope, $rootScope, $ionicPopover, $ionicSideMenuDelegate, UserService, PopupService, $translate, $ionicConfig, StoreService) {

        $ionicConfig.backButton.previousTitleText("");
        $ionicConfig.backButton.text("");

        //Clone the user settings from the root object - all screen changes will work on the local cloned object
        //only "Apply" button will send the changes to the server
        $scope.$on("$ionicView.beforeEnter", function (event, viewData) {
            $scope.localViewData = JSON.parse(JSON.stringify($rootScope.session.settings));
            //A bug - if putting "menu-close" in menu.html - back button won't show - have to close the menu programatically
            if ($rootScope.settings.languages[$rootScope.session.settings.language].direction == "ltr") {
                $ionicSideMenuDelegate.toggleLeft();
            }
            else {
                $ionicSideMenuDelegate.toggleRight();
            }
            $ionicSideMenuDelegate.canDragContent(false);

            viewData.enableBack = true;

        });

        //-------------------------------------------------------
        // Choose Language Popover
        //-------------------------------------------------------
        $ionicPopover.fromTemplateUrl("templates/chooseLanguage.html", {
            scope: $scope
        }).then(function (languagePopover) {
            $scope.languagePopover = languagePopover;
        });

        $scope.openLanguagePopover = function ($event) {
            $scope.languagePopover.show($event);
        };

        $scope.closeLanguagePopover = function (language) {
            $scope.languagePopover.hide();
        };

        //Cleanup the popover when we're done with it!
        $scope.$on("$destroy", function () {
            if ($scope.languagePopover) {
                $scope.languagePopover.remove();
            }
        });

        $scope.$on("$ionicView.beforeLeave", function () {
            if (JSON.stringify($scope.localViewData) != JSON.stringify($rootScope.session.settings)) {
                //Dirty settings - save to server

                UserService.saveSettingsToServer($scope.localViewData,
                    function (data) {
                        prevLanguage = $rootScope.user.settings.language;
                        $rootScope.user.settings = $scope.localViewData;
                        $rootScope.session.settings = $scope.localViewData;
                        if ($scope.localViewData.language != prevLanguage) {
                            $translate.use($scope.localViewData.language);
                            StoreService.setLanguage($scope.localViewData.language);

                            //Check to fire directionChanged event
                            if ($rootScope.settings.languages[$scope.localViewData.language].direction != $rootScope.settings.languages[prevLanguage].direction) {
                                $rootScope.$broadcast("topTeamer-directionChanged");
                            }
                        }
                    });
            }
        });
    })

    .controller("OtherwiseCtrl", function ($scope, $rootScope, $state) {
        $scope.$on("$ionicView.beforeEnter", function () {
            $rootScope.gotoRootView();
        });
    })

    .controller("SetContestCtrl", function ($scope, $rootScope, $state, $ionicHistory, $translate, $stateParams, ContestsService, PopupService, $ionicPopup, $ionicPopover, PaymentService, $ionicConfig, $ionicLoading, $ionicModal, HostedGamesService) {

        $ionicConfig.backButton.previousTitleText("");
        $ionicConfig.backButton.text("");

        var startDate = new Date();
        var endDate = new Date(startDate.getTime() + 1 * 24 * 60 * 60 * 1000);

        var datePickerToday = $translate.instant("DATE_PICKER_TODAY");
        var datePickerClose = $translate.instant("CLOSE");
        var datePickerSet = $translate.instant("SET");
        var datePickerErrorMessage = $translate.instant("DATE_PICKER_ERROR_MESSAGE");
        var datePickerWeekDays = $translate.instant("DATE_PICKER_WEEK_DAYS").split(",");
        var datePickerMonths = $translate.instant("MONTHS").split(",");

        $scope.contestStartDatePicker = {
            titleLabel: $translate.instant("CONTEST_START"),
            todayLabel: datePickerToday,
            closeLabel: datePickerClose,
            setLabel: datePickerSet,
            errorMsgLabel: datePickerErrorMessage,
            setButtonType: "button-assertive",
            mondayFirst: false,
            weekDaysList: datePickerWeekDays,
            monthList: datePickerMonths,
            templateType: "popup",
            modalHeaderColor: "bar-positive",
            modalFooterColor: "bar-positive",
            callback: startDateCallback
        };

        $scope.contestEndDatePicker = {
            titleLabel: $translate.instant("CONTEST_END"),
            todayLabel: datePickerToday,
            closeLabel: datePickerClose,
            setLabel: datePickerSet,
            errorMsgLabel: datePickerErrorMessage,
            setButtonType: "button-assertive",
            mondayFirst: false,
            weekDaysList: datePickerWeekDays,
            monthList: datePickerMonths,
            templateType: "popup",
            modalHeaderColor: "bar-positive",
            modalFooterColor: "bar-positive",
            //from: new Date(), //do not allow past dates
            callback: endDateCallback
        };

        if (!$rootScope.session.isAdmin) {
            //Only Admins are allowed to set past dates
            $scope.contestStartDatePicker.from = startDate;
            $scope.contestEndDatePicker.from = startDate;
        }
        else {
            var pastDate = new Date(1970, 0, 1);
            $scope.contestStartDatePicker.from = pastDate;
            $scope.contestEndDatePicker.from = pastDate;
        }

        $scope.showRemoveContest = false;

        $scope.searchQuestions = {"searchText": null};

        //-------------------------------------------------------
        // Choose Contest end option Popover
        // -------------------------------------------------------
        $ionicPopover.fromTemplateUrl("templates/chooseEndsIn.html", {
            scope: $scope
        }).then(function (contestEndsInPopover) {
            $scope.contestEndsInPopover = contestEndsInPopover;
        });

        $scope.openContestEndsInPopover = function ($event) {
            $scope.contestEndsInPopover.show($event);
        };

        $scope.closeContestEndsInPopover = function (contestEndsInOption) {
            $scope.localViewData.endOption = contestEndsInOption.value;
            $scope.localViewData.endDate = new Date((new Date()).getTime() + $rootScope.settings.newContest.endOptions[contestEndsInOption.value].number * $rootScope.settings.newContest.endOptions[contestEndsInOption.value].msecMultiplier);
            $scope.contestEndsInPopover.hide();
        };

        //-------------------------------------------------------
        // Question modal
        // -------------------------------------------------------
        $ionicModal.fromTemplateUrl("templates/question.html", function (questionModal) {
            $scope.questionModal = questionModal;
        }, {
            scope: $scope,
            animation: "slide-in-up"
        });

        function maxQuestionsReached() {
            return ($scope.localViewData.questions && $scope.localViewData.questions.visibleCount === $rootScope.settings.newContest.privateQuestions.max);
        }

        $scope.openQuestionModal = function (mode, question) {

            if (mode === "add") {
                if (maxQuestionsReached()) {
                    PopupService.alert($translate.instant("MAX_USER_QUESTIONS_REACHED", {max: $rootScope.settings.newContest.privateQuestions.max}))
                    return;
                }
                $scope.questionModalTitle = $translate.instant("NEW_QUESTION");
                $scope.question = {"text": null, answers: [null, null, null, null]};
            }
            else if (mode === "edit") {
                $scope.questionModalTitle = $translate.instant("EDIT_QUESTION");
                $scope.question = question;
            }
            else {
                return;
            }

            $scope.questionForm.$setPristine();
            $scope.questionForm.$setUntouched();
            $scope.questionModal.show();
        };

        $scope.closeQuestionModal = function (questionSet) {

            if (!questionSet) {
                $scope.questionModal.hide();
                return;
            }

            if (!$scope.localViewData.questions) {
                $scope.localViewData.questions = {"visibleCount": 0, "list": []};
            }

            //Check if question exists
            var matchCount = 0;
            for (var i = 0; i < $scope.localViewData.questions.list.length; i++) {
                if ($scope.question.text.trim() === $scope.localViewData.questions.list[i].text.trim()) {
                    matchCount++;
                }
            }

            if ((!$scope.question._id && matchCount > 0) || matchCount > 1) {
                //In edit mode - the question text will be matched at least once - to the current question in the list
                if (!$scope.questionForm.question.$error) {
                    $scope.questionForm.question.$error = {};
                }
                $scope.questionForm.question.$error["questionAlreadyExists"] = true;
                $scope.questionForm.question.$invalid = true;
                return;
            }

            if (!$scope.question._id) {
                //New questions
                $scope.question._id = "new";
                $scope.localViewData.questions.list.push($scope.question);
                $scope.localViewData.questions.visibleCount++;
            }
            else if ($scope.question._id !== "new") {
                //Set dirty flag for the question - so server will update it in the db
                $scope.question.isDirty = true;
            }

            $scope.questionModal.hide();
        };

        //-------------------------------------------------------
        // Search Questions modal
        // -------------------------------------------------------
        $ionicModal.fromTemplateUrl("templates/searchQuestions.html", function (searchQuestionsModal) {
            $scope.searchQuestionsModal = searchQuestionsModal;
        }, {
            scope: $scope,
            animation: "slide-in-up"
        });

        $scope.openSearchQuestionsModal = function () {

            if (maxQuestionsReached()) {
                PopupService.alert($translate.instant("MAX_USER_QUESTIONS_REACHED", {max: $rootScope.settings.newContest.privateQuestions.max}))
                return;
            }

            $scope.searchQuestions = {};
            $scope.searchQuestionsForm.$setPristine();
            $scope.searchQuestionsForm.$setUntouched();
            $scope.searchQuestionsModal.show();
        };

        $scope.closeSearchQuestionsModal = function (selected) {

            if (!selected || !$scope.searchQuestions.result) {
                $scope.searchQuestionsModal.hide();
                return;
            }

            //Find how many selected
            var selectedCount = 0
            for (var i = 0; i < $scope.searchQuestions.result.length; i++) {
                if ($scope.searchQuestions.result[i].checked) {
                    selectedCount++;
                }
            }

            if (!$scope.localViewData.questions) {
                $scope.localViewData.questions = {"visibleCount": 0, "list": []};
            }

            //Check if max reached together with the current questions in the contest
            if (selectedCount > 0 && $scope.localViewData.questions.visibleCount + selectedCount > $rootScope.settings.newContest.privateQuestions.max) {
                PopupService.alert($translate.instant("MAX_USER_QUESTIONS_REACHED", {max: $rootScope.settings.newContest.privateQuestions.max}))
                return;
            }

            for (var i = 0; i < $scope.searchQuestions.result.length; i++) {

                if (!$scope.searchQuestions.result[i].checked) {
                    continue;
                }

                var questionExist = false;
                for (var j = 0; j < $scope.localViewData.questions.list.length; j++) {
                    //Check if question was marked as "deleted", and now re-instated
                    if ($scope.searchQuestions.result[i]._id === $scope.localViewData.questions.list[j]._id && $scope.localViewData.questions.list[j].deleted) {
                        $scope.localViewData.questions.list[j].deleted = false;
                        questionExist = true;
                        break;
                    }
                }

                if (!questionExist) {
                    $scope.localViewData.questions.visibleCount++;
                    $scope.localViewData.questions.list.push($scope.searchQuestions.result[i]);
                }
            }

            $scope.searchQuestionsModal.hide();
        };

        //-------------------------------------------------------
        // HostedGamesService Game modal
        // -------------------------------------------------------
        $ionicModal.fromTemplateUrl("templates/chooseGame.html", function (chooseGameModal) {
            $scope.chooseGameModal = chooseGameModal;
        }, {
            scope: $scope,
            animation: "slide-in-up"
        });

        $scope.openChooseGameModal = function () {
            if (!$scope.games) {
                HostedGamesService.getGames($scope.localViewData.content.category.id, function (games) {
                    $scope.games = games;
                    $scope.chooseGameModal.show();
                });
            }
            else {
                $scope.chooseGameModal.show();
            }
        };

        $scope.closeChooseGameModal = function (game) {

            if (!game) {
                $scope.chooseGameModal.hide();
                return;
            }

            $scope.localViewData.content.game = game;
            $scope.chooseGameModal.hide();
        };


        $scope.removeQuestion = function (index) {
            PopupService.confirm("REMOVE_QUESTION", "CONFIRM_REMOVE_QUESTION", {}, function () {
                if ($scope.localViewData.questions.list && index < $scope.localViewData.questions.list.length) {
                    if ($scope.localViewData.questions.list[index]._id && $scope.localViewData.questions.list[index]._id !== "new") {
                        //Question has an id in the database - logically remove
                        $scope.localViewData.questions.list[index].deleted = true;
                    }
                    else {
                        //Question does not have an actual id in the database - physically remove
                        $scope.localViewData.questions.list.splice(index, 1);
                    }
                    $scope.localViewData.questions.visibleCount--;
                }
            });
        };

        //Cleanup the popover when we're done with it!
        $scope.$on("$destroy", function () {
            if ($scope.contestEndsInPopover) {
                $scope.contestEndsInPopover.remove();
            }
            if ($scope.questionModal) {
                $scope.questionModal.remove();
            }
            if ($scope.searchQuestionsModal) {
                $scope.searchQuestionsModal.remove();
            }
            if ($scope.chooseGameModal) {
                $scope.chooseGameModal.remove();
            }
        });

        //Hardware back button handlers
        $state.current.data.questionModal.isOpenHandler = function () {
            return $scope.questionModal.isShown()
        };
        $state.current.data.questionModal.closeHandler = $scope.closeQuestionModal;

        $state.current.data.searchQuestionsModal.isOpenHandler = function () {
            return $scope.searchQuestionsModal.isShown()
        };
        $state.current.data.searchQuestionsModal.closeHandler = $scope.closeSearchQuestionsModal;

        $state.current.data.chooseGameModal.isOpenHandler = function () {
            return $scope.chooseGameModal.isShown()
        };
        $state.current.data.chooseGameModal.closeHandler = $scope.closeChooseGameModal;

        $scope.searchSubmitted = function () {
            var existingQuestionIds = [];
            if ($scope.localViewData.questions && $scope.localViewData.questions.visibleCount > 0) {
                for (var i = 0; i < $scope.localViewData.questions.list.length; i++) {
                    if ($scope.localViewData.questions.list[i]._id && !$scope.localViewData.questions.list[i].deleted) {
                        existingQuestionIds.push($scope.localViewData.questions.list[i]._id);
                    }
                }
            }

            ContestsService.searchMyQuestions($scope.searchQuestions.searchText, existingQuestionIds, function (questions) {
                $scope.searchQuestions.result = questions;
            })
        };

        function retrieveUserQuestions() {
            ContestsService.getQuestions($scope.localViewData.userQuestions, function (questions) {
                $scope.localViewData.questions = {"visibleCount": questions.length, "list": questions};
            });
        }

        $scope.$on("$ionicView.beforeEnter", function (event, viewData) {
                if ($stateParams.mode) {
                    $scope.mode = $stateParams.mode;
                    if ($stateParams.mode === "edit") {
                        if ($stateParams.contest) {
                            $scope.localViewData = JSON.parse(JSON.stringify($stateParams.contest));
                            //Server stores in epoch - client uses real DATE objects
                            $scope.localViewData.startDate = new Date($scope.localViewData.startDate);
                            $scope.localViewData.endDate = new Date($scope.localViewData.endDate);

                            if ($scope.localViewData.participants > 0) {
                                $scope.showStartDate = false;
                            }
                            else {
                                $scope.showStartDate = true;
                            }

                            if ($scope.localViewData.content.source === "trivia" && $scope.localViewData.content.category.id === "user") {
                                retrieveUserQuestions();
                            }
                        }
                        else {
                            $rootScope.goBack();
                            return;
                        }
                    }
                    else if ($stateParams.mode === "add") {
                        //Create new local instance of a contest
                        $scope.localViewData = {
                            "startDate": startDate,
                            "endDate": endDate,
                            "endOption": "h24",
                            "content": $stateParams.content,
                            "participants": 0,
                            "manualParticipants": 0,
                            "manualRating": 0,
                            "teams": [{"name": null, "score": 0}, {"name": null, "score": 0}]
                        };
                    }

                    $scope.contestForm.$setPristine();
                    $scope.contestForm.$setUntouched();

                    $scope.showStartDate = true;

                }
                else {
                    $rootScope.gotoRootView();
                    return;
                }

                $rootScope.session.features.newContest.purchaseData.retrieved = false;

                $scope.showRemoveContest = ($stateParams.mode === "edit" && $rootScope.session.isAdmin);

                //-------------------------------------------------------------------------------------------------------------
                //Android Billing
                //-------------------------------------------------------------------------------------------------------------
                if ($rootScope.user.clientInfo.platform === "android" && $rootScope.session.features.newContest.locked) {
                    if (!$rootScope.session.features.newContest.purchaseData.retrieved) {

                        //-------------------------------------------------------------------------------------------------------------
                        //pricing - replace cost/currency with the google store pricing (local currency, etc.)
                        //-------------------------------------------------------------------------------------------------------------
                        inappbilling.getProductDetails(function (products) {
                                //In android - the price already contains the symbol
                                $rootScope.session.features.newContest.purchaseData.formattedCost = products[0].price;
                                $rootScope.session.features.newContest.purchaseData.cost = products[0].price_amount_micros / 1000000;
                                $rootScope.session.features.newContest.purchaseData.currency = products[0].price_currency_code;

                                $rootScope.session.features.newContest.purchaseData.retrieved = true;

                                //-------------------------------------------------------------------------------------------------------------
                                //Retrieve unconsumed items - and checking if user has an unconsumed "new contest unlock key"
                                //-------------------------------------------------------------------------------------------------------------
                                inappbilling.getPurchases(function (unconsumedItems) {
                                        if (unconsumedItems && unconsumedItems.length > 0) {
                                            for (var i = 0; i < unconsumedItems.length; i++) {
                                                if (unconsumedItems[i].productId === $rootScope.session.features.newContest.purchaseData.productId) {
                                                    processAndroidPurchase(unconsumedItems[i]);
                                                    break;
                                                }
                                            }
                                        }
                                    },
                                    function (error) {
                                        FlurryAgent.myLogError("AndroidBillingError", "Error retrieving unconsumed items: " + error);
                                    });

                            },
                            function (msg) {
                                FlurryAgent.myLogError("AndroidBillingError", "Error getting product details: " + msg);
                            }, $rootScope.session.features.newContest.purchaseData.productId);


                    }
                }
                else {
                    $rootScope.session.features.newContest.purchaseData.retrieved = true;
                }

                viewData.enableBack = true;

                $scope.localViewData.totalParticipants = $scope.localViewData.participants + $scope.localViewData.manualParticipants;
                $scope.showAdminInfo = false;

                //Bug - currently not working - issue opened
                $scope.contestStartDatePicker.inputDate = startDate;
                $scope.contestEndDatePicker.inputDate = endDate;
                $scope.datePickerLoaded = true;

            }
        );

        $scope.toggleAdminInfo = function () {
            if ($scope.localViewData.teams[0].name && $scope.localViewData.teams[1].name) {
                $scope.showAdminInfo = !$scope.showAdminInfo;
            }
        };

        $scope.getArrowDirection = function (stateClosed) {
            if (stateClosed) {
                if ($rootScope.settings.languages[$rootScope.session.settings.language].direction == "ltr") {
                    return "►";
                }
                else {
                    return "◄";
                }
            }
            else {
                return "▼";
            }
        }

        $scope.getTitle = function () {
            if ($stateParams.mode == "add") {
                return $translate.instant("NEW_CONTEST");
            }
            else if ($stateParams.mode == "edit") {
                return $translate.instant("EDIT_CONTEST");
            }
            else {
                return $translate.instant("WHO_IS_SMARTER");
            }
        };

        function startDateCallback(val) {
            if (val) {
                if (val <= $scope.localViewData.endDate) {
                    $scope.localViewData.startDate = val;
                }
            }
        }

        function endDateCallback(val) {
            if (val) {
                if (val >= $scope.localViewData.startDate || $rootScope.session.isAdmin) {
                    //Date picker works with time as 00:00:00.000
                    //End date should be "almost" midnight of the selected date, e.g. 23:59:59.000
                    $scope.localViewData.endDate = new Date(val.getTime() + (24 * 60 * 60 - 1) * 1000);
                }
            }
        }

        $scope.setContest = function () {
            if ($scope.localViewData.content.source === "trivia" && $scope.localViewData.content.category.id === "user") {
                if (!$scope.localViewData.questions || $scope.localViewData.questions.visibleCount < $rootScope.settings.newContest.privateQuestions.min) {
                    if (!$scope.contestForm.userQuestions.$error) {
                        $scope.contestForm.userQuestions.$error = {};
                    }
                    if ($rootScope.settings.newContest.privateQuestions.min === 1) {
                        $scope.contestForm.userQuestions.$error["minimumQuestionsSingle"] = true;
                    }
                    else {
                        $scope.contestForm.userQuestions.$error["minimumQuestionsPlural"] = true;
                    }
                    $scope.contestForm.userQuestions.$invalid = true;

                    return;
                }
            }
            else if ($scope.localViewData.content.source === "hosted" && !$scope.localViewData.content.game) {
                if (!$scope.contestForm.game.$error) {
                    $scope.contestForm.game.$error = {};
                }
                $scope.contestForm.game.$error["gameRequired"] = true;
                $scope.contestForm.game.$invalid = true;

                return;
            }

            //Tweak the manual participants
            if ($scope.localViewData.totalParticipants > $scope.localViewData.participants + $scope.localViewData.manualParticipants) {
                $scope.localViewData.manualParticipants += $scope.localViewData.totalParticipants - ($scope.localViewData.participants + $scope.localViewData.manualParticipants)
            }

            delete $scope.localViewData["totalParticipants"];

            delete $scope.localViewData["status"];

            //Server stores in epoch - client uses real DATE objects
            //Convert back to epoch before storing to server
            $scope.localViewData.startDate = $scope.localViewData.startDate.getTime();
            $scope.localViewData.endDate = $scope.localViewData.endDate.getTime();

            if ($stateParams.mode === "add" || ($stateParams.mode === "edit" && JSON.stringify($stateParams.contest) != JSON.stringify($scope.localViewData))) {

                $scope.localViewData.name = $translate.instant("FULL_CONTEST_NAME", {
                    "team0": $scope.localViewData.teams[0].name,
                    "team1": $scope.localViewData.teams[1].name
                });

                if ($stateParams.mode === "edit" && $scope.localViewData.name !== $stateParams.contest.name) {
                    $scope.localViewData.nameChanged = true;
                }

                ContestsService.setContest($scope.localViewData, $stateParams.mode, function (contest) {

                    $scope.localViewData.startDate = new Date($scope.localViewData.startDate);
                    $scope.localViewData.endDate = new Date($scope.localViewData.endDate);

                    //Report to Flurry
                    var contestParams = {
                        "team0": $scope.localViewData.teams[0].name,
                        "team1": $scope.localViewData.teams[1].name,
                        "duration": $scope.localViewData.endOption,
                        "questionsSource": $scope.localViewData.questionsSource
                    };

                    $rootScope.goBack();

                    if ($stateParams.mode === "add") {
                        FlurryAgent.logEvent("contest/created", contestParams);
                        $rootScope.$broadcast("topTeamer-contestCreated", contest);
                    }
                    else {
                        FlurryAgent.logEvent("contest/updated", contestParams);
                        $rootScope.$broadcast("topTeamer-contestUpdated", contest);
                    }

                }, function (status, error) {
                    $scope.localViewData.startDate = new Date($scope.localViewData.startDate);
                    $scope.localViewData.endDate = new Date($scope.localViewData.endDate);
                });
            }
            else {
                $rootScope.goBack();
            }

        }

        function processAndroidPurchase(purchaseData, callbackOnSuccess) {
            var extraPurchaseData = {
                "actualCost": $rootScope.session.features.newContest.purchaseData.cost,
                "actualCurrency": $rootScope.session.features.newContest.purchaseData.currency,
                "featurePurchased": $rootScope.session.features.newContest.name
            };

            PaymentService.processPayment("android", purchaseData, extraPurchaseData, function (serverPurchaseData) {

                $ionicLoading.show({
                        animation: "fade-in",
                        showBackdrop: true,
                        showDelay: 50
                    }
                );

                inappbilling.consumePurchase(function (purchaseData) {
                        $ionicLoading.hide();
                        if (callbackOnSuccess) {
                            callbackOnSuccess(purchaseData);
                        }
                        PaymentService.showPurchaseSuccess(serverPurchaseData);
                    }, function (error) {
                        $ionicLoading.hide();
                        FlurryAgent.myLogError("AndroidBilling", "Error consuming product: " + error);
                    },
                    purchaseData.productId);
            });
        }

        $scope.removeContest = function () {

            var okButton = {
                text: $translate.instant("OK"),
                type: "button-positive",
                onTap: function (e) {
                    // Returning a value will cause the promise to resolve with the given value.
                    return "OK";
                }
            };
            var cancelButton = {
                text: $translate.instant("CANCEL"),
                type: "button-default",
                onTap: function (e) {
                    return null;
                }
            };

            var buttons = [];
            buttons.push(okButton);
            buttons.push(cancelButton);

            PopupService.confirm("CONFIRM_REMOVE_TITLE", "CONFIRM_REMOVE_TEMPLATE", {name: $scope.localViewData.name}, function () {
                ContestsService.removeContest($scope.localViewData._id,
                    function (data) {
                        $rootScope.goBack();
                        $rootScope.$broadcast("topTeamer-contestRemoved");
                    });

            });
        };

        $scope.buyNewContestUnlockKey = function (isMobile) {
            $scope.buyInProgress = true;
            PaymentService.buy($rootScope.session.features.newContest, isMobile, function (result) {
                switch (result.method) {
                    case "paypal":
                        location.replace(result.data.url);
                        break;

                    case "facebook":
                        if (result.data.status === "completed") {
                            PaymentService.processPayment(result.method, result.data, null, function (serverPurchaseData) {
                                //Update local assets
                                $scope.buyInProgress = false;
                                PaymentService.showPurchaseSuccess(serverPurchaseData);
                            }, function (status, data) {
                                $scope.buyInProgress = false;
                            });
                        }
                        else if (result.data.status === "initiated") {
                            //Payment might come later from server
                            PopupService.alert({"type": "SERVER_ERROR_PURCHASE_IN_PROGRESS"});
                        }
                        else {
                            //Probably user canceled
                            $scope.buyInProgress = false;
                        }
                        break;

                    case "android":
                        processAndroidPurchase(result.data, function (data) {
                                $scope.buyInProgress = false;
                            },
                            function (status, error) {
                                $scope.buyInProgress = false;
                            })
                        break;
                }
            }, function (error) {
                $scope.$apply(function () {
                    $scope.buyInProgress = false;
                })
            });
        };

    })

    .controller("PayPalPaymentSuccessCtrl", function ($scope, $rootScope, $state, $stateParams, PaymentService, PopupService) {

        $scope.$on("$ionicView.beforeEnter", function () {

            var transactionData = {"method": "paypal"};
            transactionData.purchaseData = {};
            transactionData.purchaseData.purchaseToken = $stateParams.token;
            transactionData.purchaseData.payerId = $stateParams.PayerID;

            PaymentService.processPayment(transactionData, function (serverPurchaseData) {
                    PaymentService.showPurcaseSuccess(serverPurchaseData);
                },
                function (status, error, headers) {
                    PopupService.alert(error).then(function () {
                        $rootScope.gotoRootView();
                    });
                });
        });
    })

    .controller("PaymentCtrl", function ($scope, $rootScope, $state, $stateParams, PaymentService, $translate) {

        $scope.$on("$ionicView.beforeEnter", function () {

            $scope.nextView = $stateParams.nextView;
            $scope.unlockText = $translate.instant($rootScope.session.features[$stateParams.featurePurchased].unlockText);

        });

        $scope.proceed = function () {
            $rootScope.gotoView($scope.nextView.name, $scope.nextView.isRoot, $scope.nextView.params);
        }
    })

    .controller("FacebookCanvasCtrl", function ($scope, $rootScope, $state, $stateParams, UserService) {
        $rootScope.gotoRootView();
    })

    .controller("ServerPopupCtrl", function ($scope, $rootScope, $state, $stateParams, $ionicHistory, $timeout, $ionicPlatform) {

        $scope.$on("$ionicView.beforeEnter", function () {
            if (!$stateParams.serverPopup) {
                $rootScope.gotoRootView();
            }

            $scope.serverPopup = $stateParams.serverPopup;

            $state.current.data.currentPopup = $stateParams.serverPopup;

        });

        $scope.buttonAction = function (button) {
            switch (button.action) {
                case "dismiss" :
                    $rootScope.goBack();
                    break;

                case "link" :
                {
                    window.open(button.link, "_system", "location=yes");
                    $rootScope.goBack();
                    break;
                }

                case "linkExit" :
                {
                    window.open(button.link, "_system", "location=yes");
                    $timeout(function () {
                        ionic.Platform.exitApp();
                    }, 1000)
                    break;
                }

                case "screen" :
                {
                    $rootScope.gotoView(button.screen, button.isRootView, button.params, button.clearHistory);
                    break;
                }
            }

        }
    })

    .controller("ShareCtrl", function ($scope, $rootScope, $ionicConfig, $cordovaSocialSharing, $translate, $stateParams, ShareService) {

        $ionicConfig.backButton.previousTitleText("");
        $ionicConfig.backButton.text("");

        $scope.$on("$ionicView.beforeEnter", function (event, viewData) {

            viewData.enableBack = true;

            $scope.contest = $stateParams.contest;
            $scope.shareVariables = ShareService.getVariables($scope.contest);
        });

    })

    .controller("FriendsLeaderboardCtrl", function ($scope, $rootScope, LeaderboardService, FacebookService) {

        $scope.roundTabState = [false, true, false];

        $scope.$on("$ionicView.beforeEnter", function (event, viewData) {
            viewData.enableBack = false;

            $scope.roundTabState[1] = true;

            $scope.getFriends(false);

        });

        $scope.getFriends = function (friendsPermissionJustGranted) {
            var config = {
                "onServerErrors": {
                    "SERVER_ERROR_MISSING_FRIENDS_PERMISSION": {"next": askFriendsPermissions, "confirm": true}
                }
            };

            LeaderboardService.getFriends(friendsPermissionJustGranted, function (leaders) {
                $scope.leaders = leaders;
            }, null, config);
        }

        $scope.roundTabSwitch = function (viewName) {
            $scope.roundTabState[1] = false;
            $rootScope.gotoView(viewName, false, {}, false, true);
        };

        function askFriendsPermissions() {
            FacebookService.login(function (response) {
                    $scope.getFriends(true);
                },
                null,
                $rootScope.settings.facebook.friendsPermissions, true);
        }
    })

    .controller("WeeklyLeaderboardCtrl", function ($scope, $rootScope, LeaderboardService) {

        $scope.roundTabState = [false, false, true];

        $scope.$on("$ionicView.beforeEnter", function (event, viewData) {

            viewData.enableBack = false;

            $scope.roundTabState[2] = true;

            LeaderboardService.getWeeklyLeaders(function (leaders) {
                $scope.leaders = leaders;
            });

        });

        $scope.roundTabSwitch = function (viewName) {
            $scope.roundTabState[2] = false;
            $rootScope.gotoView(viewName, false, {}, false, true);
        };

    })

    .controller("ContestParticipantsCtrl", function ($scope, $rootScope, $ionicConfig, $translate, $stateParams, LeaderboardService) {

        $ionicConfig.backButton.previousTitleText("");
        $ionicConfig.backButton.text("");
        $scope.leaderboards = {
            "all": {"selected": true, "teamId": null},
            "team0": {"selected": false, "teamId": 0},
            "team1": {"selected": false, "teamId": 1},
        };

        $scope.selectLeaderboard = function (leaderboard) {

            FlurryAgent.logEvent("contest/participants/leaderboard/" + leaderboard);

            $scope.leaderboards.all.selected = (leaderboard === "all");
            $scope.leaderboards.team0.selected = (leaderboard === "team0");
            $scope.leaderboards.team1.selected = (leaderboard === "team1");

            LeaderboardService.getContestLeaders($scope.contest._id, $scope.leaderboards[leaderboard].teamId, function (leaders) {
                $scope.leaders = leaders;
            });

        };

        $scope.$on("$ionicView.beforeEnter", function (event, viewData) {

            if (!$stateParams.contest) {
                $rootScope.gotoRootView();
                return;
            }

            viewData.enableBack = true;
            $scope.contest = $stateParams.contest;

            $scope.selectLeaderboard("all");

        });

    })

    .controller("ContestCtrl", function ($scope, $rootScope, $ionicConfig, $translate, $stateParams, ContestsService, XpService, $ionicHistory, SoundService, $timeout, ShareService, $ionicModal, $state, DateService) {

        $ionicConfig.backButton.previousTitleText("");
        $ionicConfig.backButton.text("");
        $scope.contestChart = {};

        $scope.buttonState = null;
        $scope.animateResults = false;

        if (!$stateParams.id) {
            $rootScope.gotoRootView();
            return;
        }

        $scope.animateResults = false;

        ContestsService.getContest($stateParams.id, function (contest) {
            refreshContest(contest);
            $scope.contestTimePhrase = ContestsService.getTimePhrase(contest, "ends");
        });

        //-------------------------------------------------------
        // Propose to share immediately after contest is created
        // -------------------------------------------------------
        $ionicModal.fromTemplateUrl("templates/mobileSharePopup.html", function (mobileShareModal) {
            $scope.mobileShareModal = mobileShareModal;

            $scope.openMobileShareModal = function () {
                $scope.mobileShareModal.show();
            };

            $scope.closeMobileShareModal = function (sharePressed) {
                if (sharePressed) {
                    var contest;
                    if ($rootScope.contestJustCreated) {
                        contest = $rootScope.contestJustCreated;
                    }
                    else if ($scope.contestChart && $scope.contestChart.contest) {
                        contest = $scope.contestChart.contest;
                    }
                    $scope.share(contest);
                }
                $scope.mobileShareModal.hide();
            };

            //Hardware back button handlers - perform async - let the state fully load
            $timeout(function () {
            }, 2000)

        }, {
            scope: $scope,
            animation: "slide-in-up"
        });

        //Cleanup the popover when we're done with it!
        $scope.$on("$destroy", function () {
            if ($scope.mobileShareModal) {
                $scope.mobileShareModal.remove();
            }
        });

        $scope.$on("$ionicView.beforeEnter", function (event, viewData) {
            viewData.enableBack = true;
            //Contest is passed when clicking on chart from main screen,
            //But not passed when calling screen from direct link outside the app (Deep linking)
            if ($scope.lastQuizResults && $scope.lastQuizResults.data.facebookPost && $scope.animateResults) {
                $rootScope.gotoView("app.facebookPost", false, {"quizResults": $scope.lastQuizResults});
            }

        });

        $scope.$on("modal.hidden", function (event, viewData) {
            $rootScope.contestJustCreated = null;
        });

        $scope.$on("$ionicView.afterEnter", function (event, viewData) {
            if ($rootScope.contestJustCreated) {
                if ($rootScope.user.clientInfo.mobile) {
                    $scope.openMobileShareModal();
                }
                else {
                    $scope.share($rootScope.contestJustCreated);
                }
            }

            if ($state.current && $state.current.data && $state.current.data.mobileShareModal && !$state.current.data.mobileShareModal.isOpenHandler) {
                $state.current.data.mobileShareModal.isOpenHandler = function () {
                    return $scope.mobileShareModal.isShown()
                };
                $state.current.data.mobileShareModal.closeHandler = $scope.closeMobileShareModal;
            }

        });

        $scope.$on("$ionicView.leave", function (event, viewData) {
            $scope.animateResults = false;
            $rootScope.contestJustCreated = null;
        });

        function refreshContest(contest) {

            $scope.contestChart = ContestsService.prepareContestChart(contest, "starts");
            if (contest.status !== "finished") {
                if (contest.myTeam === 0 || contest.myTeam === 1) {
                    $scope.buttonState = "play";
                }
                else {
                    $scope.buttonState = "join";
                }
            }
            else {
                $scope.buttonState = "none";
            }
        }

        $scope.switchTeams = function () {
            if ($scope.contestChart.contest.myTeam === 0 || $scope.contestChart.contest.myTeam === 1) {
                $scope.joinContest(1 - $scope.contestChart.contest.myTeam, "footer");
            }
        }

        $scope.joinContest = function (teamId, sourceClick) {
            ContestsService.joinContest($scope.contestChart.contest._id, teamId, function (data) {

                var eventName;
                if ($scope.contestChart.contest.myTeam === null) {
                    eventName = "contest/join";
                }
                else {
                    eventName = "contest/teamSwitch";
                }
                FlurryAgent.logEvent(eventName, {
                    "contestId": $scope.contestChart.contest._id,
                    "team": "" + teamId,
                    "sourceClick": sourceClick
                });

                refreshContest(data.contest);

                //Should get xp if fresh join
                if (data.xpProgress && data.xpProgress.addition > 0) {
                    XpService.addXp(data.xpProgress);
                }

            });
        };

        function teamClicked(teamId, sourceClick) {
            var serverTeamId = teamId;
            if ($rootScope.settings.languages[$rootScope.session.settings.language].direction == "rtl") {
                serverTeamId = 1 - teamId; //In RTL - the teams are presented backwards
            }

            if ($scope.contestChart.contest.myTeam === null || $scope.contestChart.contest.myTeam != serverTeamId) {
                $scope.joinContest(serverTeamId, sourceClick);
            }
            else {
                //My team clicked
                FlurryAgent.logEvent("contest/playMyTeam", {
                    "contestId": $scope.contestChart.contest._id,
                    "team": "" + teamId,
                    "sourceClick": sourceClick
                });
                $scope.playNow();
            }
        }

        $scope.fcEvents = {
            "dataplotClick": function (eventObj, dataObj) {
                if ($scope.buttonState === "join") {
                    teamClicked(dataObj.dataIndex, "bar");
                    $scope.chartTeamEventHandled = true;
                }
            },
            "dataLabelClick": function (eventObj, dataObj) {
                if ($scope.buttonState === "join") {
                    teamClicked(dataObj.dataIndex, "label");
                    $scope.chartTeamEventHandled = true;
                }
            },
            "chartClick": function (eventObj, dataObj) {
                if (!$scope.chartTeamEventHandled && $scope.buttonState === "play") {
                    $scope.playContest();
                }
                $scope.chartTeamEventHandled = false;
            }
        };

        $scope.playContest = function () {
            FlurryAgent.logEvent("contest/playContest/click", {
                "contestId": $scope.contestChart.contest._id,
                "team": "" + $scope.contestChart.contest.myTeam
            });
            $scope.playNow();
        };

        $scope.playNow = function () {
            if ($scope.contestChart.contest.content.source === "trivia") {
                $rootScope.gotoView("app.quiz", false, {contestId: $scope.contestChart.contest._id});
            }
            else {
                $rootScope.gotoView("app.hostedGame", false, {
                    game: $scope.contestChart.contest.content.game,
                    gameId: $scope.contestChart.contest.content.game.id
                });
            }
        }

        $rootScope.$on("topTeamer-quizFinished", function (event, results) {

            refreshContest(results.contest);
            $scope.lastQuizResults = results;
            $scope.animateResults = true;
            $timeout(function () {
                SoundService.play(results.data.sound);
            }, 500);
        });

        $rootScope.$on("topTeamer-contestRemoved", function () {
            $timeout(function () {
                $rootScope.goBack();
            }, 500);

        });

        $rootScope.$on("topTeamer-contestUpdated", function (event, contest) {
            refreshContest(contest);
        });

        $scope.share = function (contest) {
            if (!contest) {
                contest = $scope.contestChart.contest;
            }
            if ($rootScope.user.clientInfo.mobile) {
                ShareService.mobileShare(contest);
            }
            else {
                $rootScope.gotoView("app.share", false, {contest: contest});
            }
        };
    })

    .controller("SystemToolsCtrl", function ($scope, $rootScope, $ionicConfig, SystemToolsService, PopupService, $ionicSideMenuDelegate) {

        $ionicConfig.backButton.previousTitleText("");
        $ionicConfig.backButton.text("");

        $scope.$on("$ionicView.beforeEnter", function (event, viewData) {
            //A bug - if putting "menu-close" in menu.html - back button won't show - have to close the menu programatically
            if ($rootScope.settings.languages[$rootScope.session.settings.language].direction == "ltr") {
                $ionicSideMenuDelegate.toggleLeft();
            }
            else {
                $ionicSideMenuDelegate.toggleRight();
            }
            $ionicSideMenuDelegate.canDragContent(false);

            viewData.enableBack = true;
        });

        $scope.clearCache = function () {
            SystemToolsService.clearCache(function (data) {
                $rootScope.settings = data;
                $rootScope.goBack();
            });
        };

        $scope.restartServer = function () {
            PopupService.confirm("SYSTEM_RESTART_CONFIRM_TITLE", "SYSTEM_RESTART_CONFIRM_TEMPLATE", {}, function () {
                SystemToolsService.restartServer(function (data) {
                    $rootScope.goBack();
                });
            });
        };
    })

    .controller("FacebookPostCtrl", function ($scope, $rootScope, $ionicConfig, $stateParams, FacebookService) {

        $ionicConfig.backButton.previousTitleText("");
        $ionicConfig.backButton.text("");

        $scope.$on("$ionicView.beforeEnter", function (event, viewData) {
            viewData.enableBack = true;
            $scope.quizResults = $stateParams.quizResults;
        });

        $scope.post = function () {
            FacebookService.post($scope.quizResults.data.facebookPost, function (response) {
                $rootScope.goBack()
            }, function (error) {
                FlurryAgent.myLogError("FacebookPostError", "Error posting: " + error);
            })
        }
    })

    .controller("LikeCtrl", function ($scope, $rootScope, $ionicConfig, $cordovaSocialSharing, $translate, $stateParams) {

        $ionicConfig.backButton.previousTitleText("");
        $ionicConfig.backButton.text("");

        $scope.$on("$ionicView.beforeEnter", function (event, viewData) {
            viewData.enableBack = true;
            $scope.contest = $stateParams.contest;
        });

        $scope.likeFacebookFanPage = function () {
            window.open($rootScope.settings.general.facebookFanPage, "_system", "location=yes");
        }
    })

    .controller("HostedGameCtrl", function ($scope, $rootScope, $ionicConfig, $stateParams, $sce) {

        $ionicConfig.backButton.previousTitleText("");
        $ionicConfig.backButton.text("");

        $scope.$on("$ionicView.beforeEnter", function (event, viewData) {
            viewData.enableBack = true;
            $scope.game = $stateParams.game;
        });

        $scope.getGameUrl = function () {
            return $sce.trustAsResourceUrl($stateParams.game.url);
        };

    })
