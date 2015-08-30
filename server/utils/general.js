//-----------------------------------------------------------------------
// global variables
//-----------------------------------------------------------------------
var supportedLanguages = {
    "en": {
        "value": "en",
        "flag": "images/languages/unitedstates.jpg",
        "direction": "ltr",
        "align": "left",
        "oppositeAlign": "right",
        "displayNames": {"en": "English", "he": "אנגלית", "es": "Inglés"}
    },
    "he": {
        "value": "he",
        "flag": "images/languages/israel.jpg",
        "direction": "rtl",
        "triviaTopics": [5, 270],
        "align": "right",
        "oppositeAlign": "left",
        "displayNames": {"en": "Hebrew", "he": "עברית", "es": "Hebreo"}
    },
    "es": {
        "value": "es",
        "flag": "images/languages/spain.jpg",
        "direction": "ltr",
        "triviaSubjectId": 210,
        "align": "left",
        "oppositeAlign": "right",
        "displayNames": {"en": "Spanish", "he": "ספרדית", "es": "Español"}
    }
}

var triviaTopisPerLangage = {
    "en": [10],
    "he": [5, 270],
    "es": [465]
}

var chartSettings = {
    "generalData": {
        "annotationsFont": "10px Arial",
        "annotationHorizontalMagicNumber": 7,
        "defaultPaletteColors" : "#CCCCCC,#CCCCCC",
        "teamPaletteColors": ["#00FF21,#CCCCCC","#CCCCCC,#00FF21"],
        "demoContestRemoveChartProperties" : ["paletteColors", "labelBgColor", "labelBorderColor"]
    },
    "chartObject": {
        "chart": {
            "bgColor" : "#FFFFFF",
            "plotBorderAlpha": 0,
            "baseFont": "Arial",
            "baseFontSize": 12,
            "showBorder": 1,
            "showCanvasBorder" : 0,
            "showPlotBorder" : 0,
            "showCanvasBg" : 0,
            "yAxisMinValue": 0.0,
            "yAxisMaxValue": 1.0,
            "numDivLines": 0,
            "adjustDiv": 0,
            "divLineColor" : "#FFFFFF",
            "labelBgColor" : "#f8f8f8",
            "labelFontColor" : "#040404",
            "labelBorderColor": "#b2b2b2",
            "labelBorderPadding" : 5,
            "numberScaleValue": ".01",
            "numberScaleUnit": "%",
            "showYAxisValues": 0,
            "valueFontSize": 12,
            "labelFontSize": "15",
            "chartBottomMargin": 25,
            "valuePadding": 0,
            "labelPadding" : 10,
            "useRoundEdges": "1",
            "showToolTip": 0,
            "labelDisplay": "auto",
            "useEllipsesWhenOverflow": 1,
            "maxLabelWidthPercent": 50
        },
        "annotations": {
            "groups": [
                {
                    "id": "infobar",
                    "items": [
                        {
                            "id": "label",
                            "type": "text",
                            "y": "$chartendy - 8",
                            "fontSize": 10,
                            "font": "Arial",
                            "fontColor": "#000000"
                        },
                        {
                            "id": "label",
                            "type": "text",
                            "y": "$chartendy - 8",
                            "fontSize": 10,
                            "font": "Arial",
                            "fontColor": "#000000"
                        }
                    ]
                }
            ]
        },
    },
}

//-----------------------------------------------------------------------
// getDirectionByLanguage
//
// returns the direction (ltr/rtl) based on language
//-----------------------------------------------------------------------
module.exports.getDirectionByLanguage = getDirectionByLanguage;
function getDirectionByLanguage(languageCodeIso2) {
    switch (languageCodeIso2) {
        case "he":
            return "rtl";
        default:
            return "ltr";
    }
}

//-----------------------------------------------------------------------
// getLanguageByCountryCode
//
// returns the default language based on country ISO2 code
//-----------------------------------------------------------------------
module.exports.getLanguageByCountryCode = getLanguageByCountryCode;
function getLanguageByCountryCode(countryCode) {

    switch (countryCode) {
        case "IL":
            return "he";

        case "AR":  //Argentina
        case "BO":  //Bolivia
        case "CL":  //Chile
        case "CO":  //Colombia
        case "CR":  //Costa Rica
        case "DO":  //Dominican Republic
        case "EC":  //Ecuador
        case "ES":  //Spain
        case "GT":  //Guatemala
        case "HN":  //Honduras
        case "MX":  //Mexico
        case "NI":  //Nicaragua
        case "PA":  //Panama
        case "PE":  //Peru
        case "PR":  //Puerto Rico
        case "PY":  //Paraguay
        case "SV":  //El Salvador
        case "UY":  //Uruguay
        case "VE":  //Venezuela
            return "es";

        default:
            return "en";
    }
}

//-----------------------------------------------------------------------
// geoInfo
//
// returns language based on country
//-----------------------------------------------------------------------
module.exports.geoInfo = function (req, res, next) {
    var geoInformation = req.body;
    var language = getLanguageByCountryCode(geoInformation.country_code);
    res.json({"language": language});
}

//-----------------------------------------------------------------------
// getSettings
//
// returns general server settings for each client
//-----------------------------------------------------------------------
module.exports.getSettings = function (req, res, next) {
    res.json({"languages": supportedLanguages, "chartSettings": chartSettings});
}

//-----------------------------------------------------------------------
// getLanguageTriviaTopics
//
// returns trivia topic list for each language
//-----------------------------------------------------------------------
module.exports.getLanguageTriviaTopics = function (language) {
    return triviaTopisPerLangage[language];
}
