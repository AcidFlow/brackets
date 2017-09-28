/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, document, Mustache*/

define(function (require, exports, module) {
    "use strict";

    var EditorManager  = brackets.getModule("editor/EditorManager"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        lineWidgetHTML = require("text!inlineWidget.html"),
        errorMessages = require("strings"),
        currentErrorWidget,
        errorToggle,
        isShowingDescription,
        highlights = [];

    ExtensionUtils.loadStyleSheet(module, "main.less");
    require("tooltipsy.source");

    //Publicly available function to remove all errors from brackets
    function cleanUp(line, type) {

        if(type == "keep-emoji") {
            removeButton("instant");
        } else {
            removeButton();
        }

        removeInvalidCodeHighlight();
        // removeLineHighlight(line);
        hideDescription();
        isShowingDescription = false;
    }

    // Check if the erorr marker is already present
    function checkForMarker(){
        var marker = document.querySelector(".hint-marker-error") || false;
        if(marker) {
            return true;
        } else {
            return false;
        }
    }

    //Publicly available function used to display error markings
    function _addInvalidCodeHighlight(highlight) {
        addTextHighlight(highlight.start, highlight.end, "red-text");

        highlights.push({
            start: highlight.start,
            end: highlight.end
        });

        // TODO - make this better, we should find out how long the document is firsT?
        addTextHighlight(highlight.end, 9999999999, "faint-text");

        highlights.push({
            start: highlight.end,
            end: 9999999999
        });
    }


    //Publicly available function used to display error markings
    function addInvalidCodeHighlight(token) {
        var start = token.interval.start;
        var end = token.interval.end;

        addTextHighlight(start, end, "red-text");

        highlights.push({
            start: start,
            end: end
        });

        // TODO - make this better, we should find out how long the document is firsT?
        addTextHighlight(end, 9999999999, "faint-text");

        highlights.push({
            start: end,
            end: 9999999999
        });
    }

    function removeInvalidCodeHighlight() {
        // Remove all of the code we highlighted
        for(var i = 0; i < highlights.length; i++) {
            var highlight = highlights[i];
            removeTextHighlight(highlight.start, highlight.end);
        }
        highlights = [];
    }

    //Publicly available function used to display error markings
    function scafoldHinter(errorStart, errorEnd, errorObj, markerAnimation, errorType) {
        //Setup neccessary variables
        errorToggle = document.createElement("div");
        isShowingDescription = false;

        showButton(errorObj, markerAnimation);

        // addLineHighlight(errorObj);

        //Apply on click method to the errorToggle to display the inLineErrorWidget
        errorToggle.onclick = function() {
            if(!isShowingDescription) {
                showDescription(errorObj, errorType);
            }
            else {
                hideDescription();
            }
            isShowingDescription = !isShowingDescription;
        };
        return $(errorToggle);
    }

    //Returns the current editor we reside in
    function getActiveEditor() {
        return EditorManager.getActiveEditor();
    }

    //Returns the current instance of codeMirror
    function getCodeMirror() {
        return getActiveEditor()._codeMirror;
    }

    //Highlights the line in which the error is present
    // function addLineHighlight(errorObject) {
    //     if(!errorObject.line) {
    //         return;
    //     }
    //     getCodeMirror().getDoc().addLineClass(errorObject.line, "background", "errorHighlight");
    // }

    //Removes highlight from line in which error was present
    // function removeLineHighlight(line) {
    //     if(!line) {
    //         return;
    //     }
    //     getCodeMirror().getDoc().removeLineClass(line, "background", "errorHighlight");
    // }

    //Function that adds a button on the gutter (on given line nubmer) next to the line numbers
    function showButton(errorObject, animationType){
        getCodeMirror().addWidget(errorObject, errorToggle, false);
        $(errorToggle).attr("class", "hint-marker-positioning hint-marker-error").removeClass("hidden");

        // Sometimes we want this to pop in instead of appearing instantly,
        // This is where that happens.
        if(animationType == "animated") {
            $(errorToggle).attr("class", "hint-marker-positioning hint-marker-error").addClass("pop");
        }

        // Show tooltips message
        // TODO - this shows even when the error is open, so that's not great
        // $(".hint-marker-positioning").tooltipsy({
        //     content : "Click error icon for details",
        //     alignTo: "cursor", // Can also use on an element
        //     offset: [10, -10]
        // });
    }

    // Function that removes gutter button
    function removeButton(animationType){
        if(!errorToggle) {
            return;
        }

        // Maybe sometimes we'll need to remove it instantly, so I'll add a speed argument
        // for future use you fucken idiots.

        var goodEmojis = [
            "biceps","halo","heart","peace","sunglasses","wink","horns","thumbs"
        ];

        var randomEmoji = goodEmojis[Math.floor(Math.random() * goodEmojis.length)];

        if (errorToggle.parentNode) {

            if(animationType == "instant") {
                $(errorToggle).remove();
            } else {
                $(errorToggle).addClass("bye");

                // Adds the class for the "positive" emoji we want to use
                // partway through the animation. This is a workaround becuase we are
                // using a CSS animation, so it's hard to make it dynamic.
                setTimeout(function(el) {
                    return function() {
                        el.classList.add(randomEmoji);
                    };
                }(errorToggle), 400);

                setTimeout(function(el) {
                    return function() {
                        el.remove();
                    };
                }(errorToggle), 1300);

                setTimeout(function(el) {
                    return function() {
                        el.remove();
                    };
                }(errorToggle), 1300);
            }
        }

        //Destroy tooltips instance
        // var tooltips = $(".hint-marker-positioning").data("tooltipsy");
        // if(tooltips) {
            // tooltips.destroy();
        // }

        isShowingDescription = false;
    }

    // Creates & shows the error description
    function showDescription(error, errorType) {
        errorToggle.classList.add("nerd");

        var description = document.createElement("div");
        description.className = "errorPanel";

        description.innerHTML = Mustache.render(lineWidgetHTML, {
            "error": error.message,
            "errorType": errorMessages[errorType + "_TITLE"]
        });

        var highlightEls = description.querySelectorAll('[data-highlight]');

        for (var i = 0; i < highlightEls.length; ++i) {
            var highlightEl = highlightEls[i];
            highlightEl.addEventListener("mouseenter",function(){
                var coordAttr = this.getAttribute("data-highlight") || false;
                if(coordAttr) {
                    var coords = coordAttr.split(",");
                    addTextHighlight(coords[0], coords[1], "styled-background");
                }
            });

            highlightEl.addEventListener("mouseleave",function(){
                var coordAttr = this.getAttribute("data-highlight") || false;
                if(coordAttr) {
                    var coords = coordAttr.split(",");
                    removeTextHighlight(coords[0], coords[1]);
                }
            });
        }

        var options = {coverGutter: false, noHScroll: false, above: false, showIfHidden: false};

        // https://codemirror.net/doc/manual.html#addLineWidget
        // console.log(getCodeMirror());
        currentErrorWidget = getCodeMirror().addLineWidget(error.line, description, options);
    }

    // Stores the highlight objects created when adding text highlight
    var activeTextHighlights = {};

    // Adds a text higlight to the code
    function addTextHighlight(start, end, className){
        var startHighlight = getCodeMirror().doc.posFromIndex(start);
        var endHighlight = getCodeMirror().doc.posFromIndex(end);
        var highlight = getCodeMirror().markText(startHighlight, endHighlight, { className: className, startStyle: "mark-start" });
        activeTextHighlights[start + "," + end] = highlight;
    }

    // Removes a text higlight to the code
    function removeTextHighlight(start, end){
        var highlight = activeTextHighlights[start + "," + end] || false;
        if(highlight){
            highlight.clear();
            delete activeTextHighlights[start + "," + end];
        }
    }

    //Destroys the description
    function hideDescription() {
        if(!currentErrorWidget) {
            return;
        }

        errorToggle.classList.remove("nerd");
        currentErrorWidget.clear();
        currentErrorWidget = null;
    }

    exports.checkForMarker = checkForMarker;
    exports.cleanUp = cleanUp;
    exports.scafoldHinter = scafoldHinter;
    exports.addInvalidCodeHighlight = addInvalidCodeHighlight;
    exports._addInvalidCodeHighlight = _addInvalidCodeHighlight; // temp new version
});
