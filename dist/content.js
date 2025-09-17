var x=Object.defineProperty;var f=(o,e,t)=>e in o?x(o,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):o[e]=t;var c=(o,e,t)=>(f(o,typeof e!="symbol"?e+"":e,t),t);class r{static isContextValid(){var e;try{return!!((e=chrome==null?void 0:chrome.runtime)!=null&&e.id)}catch{return!1}}static getContextInvalidMessage(){return"Extension has been reloaded. Please refresh the page to continue using the AI Screenshot Assistant."}static isDevelopment(){var e;try{return((e=chrome.runtime.getManifest().version_name)==null?void 0:e.includes("dev"))||!1}catch{return!1}}static markElementAsInvalid(e){e.style.opacity="0.5",e.style.cursor="not-allowed",e.title=this.getContextInvalidMessage()}static markElementAsValid(e){e.style.opacity="1",e.style.cursor="pointer",e.title=""}}class E{constructor(){c(this,"dotElement",null);c(this,"answerBox",null);c(this,"isProcessing",!1);c(this,"isDragging",!1);console.log("🤖 AI Screenshot Assistant - Content script initializing"),this.init(),this.setupDisconnectionHandler()}isExtensionContextValid(){return r.isContextValid()}setupDisconnectionHandler(){if(chrome.runtime&&chrome.runtime.onConnect)try{chrome.runtime.connect({name:"content-script"}).onDisconnect.addListener(()=>{console.log("🔌 Extension context disconnected"),this.dotElement&&r.markElementAsInvalid(this.dotElement)})}catch{console.log("⚠️ Could not establish connection port (extension may be reloading)")}}init(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.createDot()):this.createDot()}createDot(){this.dotElement||(console.log("🎯 AI Screenshot Assistant - Creating purple dot"),this.dotElement=document.createElement("div"),this.dotElement.id="ai-assistant-dot",this.dotElement.style.cssText=`
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 40px;
      background: rgba(245, 245, 245, 0.8);
      border-radius: 50%;
      cursor: pointer;
      z-index: 2147483647;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(220, 220, 220, 0.6);
      backdrop-filter: blur(10px);
    `,this.dotElement.addEventListener("click",()=>{this.isDragging||this.handleClick()}),this.setupDragFunctionality(),document.body.appendChild(this.dotElement),console.log("✅ AI Screenshot Assistant - Purple dot added to page"))}setupDragFunctionality(){if(!this.dotElement)return;let e=0,t=0,n=0,i=0,a=!1;const h=l=>{if(this.isProcessing)return;e=l.clientX,t=l.clientY,a=!1;const d=this.dotElement.getBoundingClientRect();n=d.left,i=d.top,this.dotElement.style.transition="none",document.addEventListener("mousemove",s),document.addEventListener("mouseup",m),l.preventDefault()},s=l=>{const d=l.clientX-e,u=l.clientY-t;if((Math.abs(d)>3||Math.abs(u)>3)&&(this.isDragging=!0,a=!0),this.isDragging){const p=Math.max(20,Math.min(window.innerWidth-60,n+d)),g=Math.max(20,Math.min(window.innerHeight-60,i+u));this.dotElement.style.left=p+"px",this.dotElement.style.top=g+"px",this.dotElement.style.bottom="auto",this.dotElement.style.transform="none",this.dotElement.style.position="fixed"}},m=()=>{this.dotElement.style.transition="all 0.3s ease",setTimeout(()=>{this.isDragging=!1},a?150:0),document.removeEventListener("mousemove",s),document.removeEventListener("mouseup",m)};this.dotElement.addEventListener("mousedown",h)}async handleClick(){if(!this.isProcessing){if(!this.isExtensionContextValid()){this.showAnswer(r.getContextInvalidMessage());return}this.isProcessing=!0,this.setLoadingState(),this.hideAnswerBox();try{const e=await this.sendScreenshotRequest();if(e.success&&e.answer){const t=this.extractFinalAnswer(e.answer);this.showAnswer(t)}else this.showAnswer("Error: "+(e.error||"Unknown error occurred"))}catch(e){console.error("Error in handleClick:",e);const t=e.message;t.includes("Extension has been reloaded")||t.includes("context invalidated")?this.showAnswer(r.getContextInvalidMessage()):this.showAnswer("Error: Failed to process request")}finally{this.isProcessing=!1,this.resetDotState()}}}setLoadingState(){if(this.dotElement&&(this.dotElement.innerHTML=`
      <div style="
        width: 16px; 
        height: 16px; 
        border: 2px solid rgba(120, 120, 120, 0.6); 
        border-top: 2px solid transparent; 
        border-radius: 50%; 
        animation: spin 1s linear infinite;
      "></div>
    `,!document.getElementById("ai-assistant-spinner-style"))){const e=document.createElement("style");e.id="ai-assistant-spinner-style",e.textContent=`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `,document.head.appendChild(e)}}resetDotState(){this.dotElement&&(this.dotElement.innerHTML="")}extractFinalAnswer(e){let t=e;t=t.replace(/^(Let me analyze|Looking at|I can see|Based on|After analyzing).*?[\.\:]\s*/i,""),t=t.replace(/^(ANALYSIS|FIRST PASS|SECOND PASS|THIRD PASS|FOURTH PASS|FINAL PASS).*?\n/gmi,""),t=t.replace(/\[HIGH\]|\[MEDIUM\]|\[LOW\]/gi,""),t=t.replace(/VERIFIED:\s*/i,""),t=t.replace(/CONFIDENCE:\s*\d+%/gi,""),t=t.replace(/Begin.*analysis.*:/i,"");const n=t.split(`
`).filter(s=>s.trim()),i=t.match(/^([A-E])\.?\s*$/m);if(i)return i[1];const a=n.find(s=>/^(Answer|Result|Solution):\s*/i.test(s)||/^\d+\.?\s*[A-E]\.?\s*$/.test(s)||/^\d+(\.\d+)?$/.test(s.trim())||/^[A-E]\.?\s*$/.test(s.trim()));return a?a.replace(/^(Answer|Result|Solution):\s*/i,"").trim():n.find(s=>s.length<100&&!s.includes("analyze")&&!s.includes("looking")&&!s.includes("protocol"))||n[0]||t.trim()}showAnswer(e){this.hideAnswerBox();const t=this.dotElement.getBoundingClientRect();if(this.answerBox=document.createElement("div"),this.answerBox.id="ai-assistant-answer-box",this.answerBox.style.cssText=`
      position: fixed;
      left: ${Math.min(t.left,window.innerWidth-300)}px;
      top: ${t.bottom+10}px;
      max-width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.3;
      color: #333;
      z-index: 2147483646;
      word-wrap: break-word;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(220, 220, 220, 0.8);
      border-radius: 8px;
      padding: 8px 12px;
      margin: 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(10px);
      animation: fadeIn 0.3s ease-out;
      cursor: pointer;
    `,this.answerBox.textContent=e,this.answerBox.addEventListener("click",()=>this.hideAnswerBox()),!document.getElementById("ai-assistant-animation-style")){const n=document.createElement("style");n.id="ai-assistant-animation-style",n.textContent=`
        @keyframes fadeIn {
          0% { 
            opacity: 0; 
            transform: translateY(-5px); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
      `,document.head.appendChild(n)}document.body.appendChild(this.answerBox),setTimeout(()=>this.hideAnswerBox(),1e4)}sendScreenshotRequest(){return new Promise((e,t)=>{if(!r.isContextValid()){t(new Error(r.getContextInvalidMessage()));return}try{chrome.runtime.sendMessage({type:"CAPTURE_SCREENSHOT"},n=>{if(chrome.runtime.lastError){const i=chrome.runtime.lastError.message;i!=null&&i.includes("context invalidated")||i!=null&&i.includes("Extension context")?t(new Error(r.getContextInvalidMessage())):t(new Error(i||"Unknown extension error"))}else n?e(n):t(new Error("No response received from extension"))})}catch(n){t(new Error("Failed to communicate with extension: "+n.message))}})}hideAnswerBox(){this.answerBox&&(this.answerBox.remove(),this.answerBox=null)}}new E;
