// ==UserScript==
// @name     SalesForce Lightning navLeft toggle
// @version  1.3
// @grant    none
// @include  https://mongodb.lightning.force.com/*
// ==/UserScript==
function log(msg) {
  if (console && console.log && (typeof console.log === "function")) console.log(msg)
}

var _readyFunc_interval = setInterval(function() {
    if((document.readyState === 'complete')&&(document.getElementsByClassName("navLeft").length>0)) {
        log("navLeft active.");
        clearInterval(_readyFunc_interval);
        var btn = document.createElement("span");
        btn.style.position="absolute";
        btn.id = "navLeft_Toggle_Button";
        var el = document.getElementsByClassName("navLeft")[0];
        var box = el.getBoundingClientRect();
        btn.style.top = box.top;
        btn.style.left = "4px";
        btn.style.height = (box.height-8) +"px";
        btn.style.zIndex = 1000;
        var pointright='<svg height="100%" viewBox="0 0 40 80"> <g> <path stroke="gray" fill="none" stroke-width="3" d="M13 20L27 40 13 60"></path> <path stroke="gray" fill="none" stroke-width="1" d="M10 0L30 0A10 10 0 0 1 40 10L40 70A10 10 0 0 1 30 80L10 80A10 10 0 0 1 0 70L0 10A10 10 0 0 1 10 0"></path> </g> </svg>';
        var pointleft='<svg height="100%" viewBox="0 0 40 80"> <g> <path stroke="gray" fill="none" stroke-width="3" d="M27 20L13 40 27 60"></path> <path stroke="gray" fill="none" stroke-width="1" d="M10 0L30 0A10 10 0 0 1 40 10L40 70A10 10 0 0 1 30 80L10 80A10 10 0 0 1 0 70L0 10A10 10 0 0 1 10 0"></path> </g> </svg>';
        navBarVisibility = function(_showit) {
          var elem=document.getElementsByClassName("navLeft")[0]; 
          if (_showit === undefined) {
              elem.style.display=((elem.style.display.match(/none/i))?"":"None");
          } else {
              elem.style.display=(_showit?"":"None");
          }
          //btn.innerHTML = ((elem.style.display.match(/none/i))?">":"<");
          btn.innerHTML = ((elem.style.display.match(/none/i))?pointright:pointleft);
          window.dispatchEvent(new Event('resize'));
        }
        
        btn.onclick=function(){navBarVisibility();}
        //var logo = document.getElementsByClassName("slds-global-header__logo")
        //if (logo.length > 0) {
        //  logo[0].appendChild(btn);
        //} else {
        //  document.body.appendChild(btn);
        //}
        el.parentNode.insertBefore(btn,el)
        log("navLeft set default");
        navBarVisibility(false);
    }
}, 100)
