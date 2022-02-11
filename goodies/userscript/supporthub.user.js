// ==UserScript==
// @name     Support Hub copy case number
// @version  1.0
// @grant    none
// @include https://support-hub.corp.mongodb.com/*
// ==/UserScript==

window.addEventListener('load', function() {
    var observer = new MutationObserver(monitor);
    var timer = null;
    function addButton(el) {
        var typediv = el.parentNode.previousSibling;
        var buttons = typediv.getElementsByClassName("copy");
        if (buttons.length == 0) {
            // clickable span seems odd, but it looks better than a button
            var btn=document.createElement("span");
            btn.id = "click_"+el.innerText;
            btn.innerHTML='<svg viewBox="0 0 52 52" height="1.5em"><g><path stroke="black" stroke-width="2" fill="none" d="M4 4l0 40 26 0 0 -32 -8 -8 8 8 -8 0 0 -8Z"></path><path fill="none" stroke="black" d="M8 24l18 0 -6 0 0 -6 0 18 0 -6 6 0 -18 0 6 0 0 6 0 -18"></path></g></svg>';
            btn.style["margin-left"]="-1em";
            btn.className="copy"
            btn.onclick = function(){
                navigator.clipboard.writeText(el.innerText);
                console.log(this.id);
                console.log("set it green")
                Array.from(this.getElementsByTagName("path")).forEach(function(el){el.setAttribute("stroke","green")});
                console.log("scheduled revert to black");
                var me = this;
                window.setTimeout(function(){
                  console.log("time to revert click_"+me.id);
                  Array.from(me.getElementsByTagName("path")).forEach(function(elem){console.log("revert 1");elem.setAttribute("stroke","black")});
                  console.log("done reverting");
                },100)
                console.log("return false");
                return false
            };
            typediv.appendChild(btn);
        }
    }
    function addButtons() {
        //since only case links are modified, this could theoretically run over the entire document
        //limiting to tables-wrapper just to be safe
        var panes = document.getElementsByClassName("tables-wrapper");
        //there should only be one, but you never know ...
        Array.from(panes).forEach(
            function(pane){
                var links=pane.getElementsByTagName("a");
                //SalesForce case links have 'case' in the title
                Array.from(links).filter(e=>e.title.match(/case/)).forEach(elem => addButton(elem))
            }
        )
    }
    function monitor(changes, observer) {
        //disable the timeout hack on the first update
        if(timer){
            clearTimeout(timer);
            timer = null;
        }
        //stop watching for changes while making changes
        observer.disconnect();
        addButtons();
        observe();
    }
    function observe() {
        observer.observe(document.getElementsByClassName("tables-wrapper")[0], {childList: true, subtree: true});
    }
    console.log("Monkey Check tables-wrapper");
    if( document.getElementsByClassName("tables-wrapper").length > 0) {
        observer.disconnect();
        observer = new MutationObserver(monitor);
        observe();
        //there is some sort of glitch that the first refresh of the TC view doesn't get buttons
        //the timer is a hack to make that happens
        timer = setTimeout(addButtons,500);
    }
    observe();
}, false);

