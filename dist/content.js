var p=Object.defineProperty;var E=(i,e,t)=>e in i?p(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var d=(i,e,t)=>(E(i,typeof e!="symbol"?e+"":e,t),t);class o{static isContextValid(){var e;try{return!!((e=chrome==null?void 0:chrome.runtime)!=null&&e.id)}catch{return!1}}static getContextInvalidMessage(){return"Extension has been reloaded. Please refresh the page to continue using the AI Screenshot Assistant."}static isDevelopment(){var e;try{return((e=chrome.runtime.getManifest().version_name)==null?void 0:e.includes("dev"))||!1}catch{return!1}}static markElementAsInvalid(e){e.style.opacity="0.5",e.style.cursor="not-allowed",e.title=this.getContextInvalidMessage()}static markElementAsValid(e){e.style.opacity="1",e.style.cursor="pointer",e.title=""}}class f{constructor(){d(this,"dotElement",null);d(this,"answerBox",null);d(this,"isProcessing",!1);d(this,"isDragging",!1);console.log("🤖 AI Screenshot Assistant - Content script initializing"),this.init(),this.setupDisconnectionHandler()}isExtensionContextValid(){return o.isContextValid()}setupDisconnectionHandler(){if(chrome.runtime&&chrome.runtime.onConnect)try{chrome.runtime.connect({name:"content-script"}).onDisconnect.addListener(()=>{console.log("🔌 Extension context disconnected"),this.dotElement&&o.markElementAsInvalid(this.dotElement)})}catch{console.log("⚠️ Could not establish connection port (extension may be reloading)")}}init(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>this.createDot()):this.createDot()}createDot(){this.dotElement||(console.log("🎯 AI Screenshot Assistant - Creating purple dot"),this.dotElement=document.createElement("div"),this.dotElement.id="ai-assistant-dot",this.dotElement.style.cssText=`
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
    `,this.dotElement.addEventListener("click",()=>{this.isDragging||this.handleClick()}),this.setupDragFunctionality(),document.body.appendChild(this.dotElement),console.log("✅ AI Screenshot Assistant - Purple dot added to page"))}setupDragFunctionality(){if(!this.dotElement)return;let e=0,t=0,n=0,s=0,l=!1;const u=r=>{if(this.isProcessing)return;e=r.clientX,t=r.clientY,l=!1;const a=this.dotElement.getBoundingClientRect();n=a.left,s=a.top,this.dotElement.style.transition="none",document.addEventListener("mousemove",c),document.addEventListener("mouseup",h),r.preventDefault()},c=r=>{const a=r.clientX-e,m=r.clientY-t;if((Math.abs(a)>3||Math.abs(m)>3)&&(this.isDragging=!0,l=!0),this.isDragging){const x=Math.max(20,Math.min(window.innerWidth-60,n+a)),g=Math.max(20,Math.min(window.innerHeight-60,s+m));this.dotElement.style.left=x+"px",this.dotElement.style.top=g+"px",this.dotElement.style.bottom="auto",this.dotElement.style.transform="none",this.dotElement.style.position="fixed"}},h=()=>{this.dotElement.style.transition="all 0.3s ease",setTimeout(()=>{this.isDragging=!1},l?150:0),document.removeEventListener("mousemove",c),document.removeEventListener("mouseup",h)};this.dotElement.addEventListener("mousedown",u)}async handleClick(){if(!this.isProcessing){if(!this.isExtensionContextValid()){this.showError(o.getContextInvalidMessage());return}this.isProcessing=!0,this.setLoadingState(),this.hideAnswerBox();try{const e=await this.sendScreenshotRequest();e.success&&e.answer?this.showAnswer(e.answer):this.showError(e.error||"Unknown error occurred")}catch(e){console.error("Error in handleClick:",e);const t=e.message;t.includes("Extension has been reloaded")||t.includes("context invalidated")?this.showError(o.getContextInvalidMessage()):this.showError("Failed to process request: "+t)}finally{this.isProcessing=!1,this.resetDotState()}}}setLoadingState(){if(this.dotElement&&(this.dotElement.innerHTML=`
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
      `,document.head.appendChild(e)}}resetDotState(){this.dotElement&&(this.dotElement.innerHTML="")}sendScreenshotRequest(){return new Promise((e,t)=>{if(!o.isContextValid()){t(new Error(o.getContextInvalidMessage()));return}try{chrome.runtime.sendMessage({type:"CAPTURE_SCREENSHOT"},n=>{if(chrome.runtime.lastError){const s=chrome.runtime.lastError.message;s!=null&&s.includes("context invalidated")||s!=null&&s.includes("Extension context")?t(new Error(o.getContextInvalidMessage())):t(new Error(s||"Unknown extension error"))}else n?e(n):t(new Error("No response received from extension"))})}catch(n){t(new Error("Failed to communicate with extension: "+n.message))}})}showAnswer(e){this.hideAnswerBox();const t=this.dotElement.getBoundingClientRect();if(this.answerBox=document.createElement("div"),this.answerBox.id="ai-assistant-answer-box",this.answerBox.style.cssText=`
      position: fixed;
      left: ${Math.min(t.left,window.innerWidth-300)}px;
      top: ${t.bottom+10}px;
      max-width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10px;
      line-height: 1.3;
      color: #333;
      z-index: 2147483646;
      word-wrap: break-word;
      background: rgba(0, 0, 0, 0);
      border: none;
      border-radius: 0;
      padding: 4px 6px;
      margin: 0;
      box-shadow: none;
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
      `,document.head.appendChild(n)}document.body.appendChild(this.answerBox),setTimeout(()=>this.hideAnswerBox(),1e4)}showError(e){this.showAnswer(`Error: ${e}`)}hideAnswerBox(){this.answerBox&&(this.answerBox.remove(),this.answerBox=null)}}new f;
