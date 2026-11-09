import{n as T,S as k,O as P,f as I,p as _,V as z,Y as G,ak as O,M as W,r as C,X as b}from"./three.module.CxMWkkZZ.js";import{S as K}from"./silk-fabric.BpcHggaO.js";const X=["#e0e5ed","#ef6977","#e6c16e","#6cb8f3"];function j(S,B){const m=new T({canvas:S,alpha:!0,antialias:!1,powerPreference:"low-power",premultipliedAlpha:!0});m.setClearColor(0,0);const D=new k,F=new P(-1,1,1,-1,.1,3);F.position.z=1;const h={uTime:{value:0},uScroll:{value:0},uViewport:{value:new z(1,1)},uStrength:{value:0}},u=X.map((e,s)=>{const n=new I({transparent:!0,depthTest:!1,depthWrite:!1,side:O,blending:G,toneMapped:!1,uniforms:{...h,uColor:{value:new _(e)},uFrontier:{value:0},uLength:{value:1},uBranch:{value:s===0?0:1}},vertexShader:`
    uniform vec2 uViewport;uniform float uScroll;
    attribute float aDistance,aSide;varying float vDistance,vSide;
    void main(){
     vDistance=aDistance;vSide=aSide;
     gl_Position=vec4(position.x/uViewport.x*2.0-1.0,1.0-(position.y-uScroll)/uViewport.y*2.0,0.0,1.0);
    }`,fragmentShader:`
    uniform float uTime,uStrength,uFrontier,uLength,uBranch;uniform vec3 uColor;
    varying float vDistance,vSide;
    ${K}
    void main(){
     float phase=uTime*.065,u=vDistance/mix(650.0,300.0,uBranch),silk=0.0;
     for(int i=0;i<3;i++){
      float layer=float(i);
      float center=sin(u*6.6+phase+layer*.86)*.13+sin(u*12.0-phase*.6+layer)*.035+(layer-1.0)*.10;
      float width=.27+layer*.026+sin(u*4.0+layer)*.025;
      silk+=silkFabric((vSide-center)/width,u,layer,phase);
     }
     float edge=1.0-smoothstep(.72,1.0,abs(vSide));
     float reveal=1.0-smoothstep(uFrontier-65.0,uFrontier+8.0,vDistance);
     float ends=smoothstep(0.0,22.0,vDistance)*(1.0-smoothstep(uLength-30.0,uLength,vDistance));
     float alpha=silk*edge*reveal*ends*uStrength*(.96+.04*sin(uTime*.65));
     gl_FragColor=vec4(uColor,alpha*mix(.90,1.05,uBranch));
    }`}),a=new W(new C,n);return a.frustumCulled=!1,D.add(a),a});let d=!1;const L=e=>{e.preventDefault(),B()};S.addEventListener("webglcontextlost",L);function E(e,s){const n=[],a=[],c=[],w=[],r=e.samples.map((t,o)=>{const p=e.samples[Math.max(0,o-1)],v=e.samples[Math.min(e.samples.length-1,o+1)],g=t.x-p.x,y=t.y-p.y,x=v.x-t.x,i=v.y-t.y,l=Math.hypot(g,y),M=Math.hypot(x,i),A=l>.001&&M>.001?Math.acos(Math.max(-1,Math.min(1,(g*x+y*i)/(l*M)))):0,V=A>.001?(l+M)*.5/A:1e5,R=.07+.93*Math.pow(Math.max(0,Math.sin(t.distance/e.length*Math.PI)),.35);return Math.min(s*R,Math.max(2,V*.48))});for(let t=1;t<r.length;t++)r[t]=Math.min(r[t],r[t-1]+(e.samples[t].distance-e.samples[t-1].distance)*.32);for(let t=r.length-2;t>=0;t--)r[t]=Math.min(r[t],r[t+1]+(e.samples[t+1].distance-e.samples[t].distance)*.32);e.samples.forEach((t,o)=>{const p=e.samples[Math.max(0,o-1)],v=e.samples[Math.min(e.samples.length-1,o+1)],g=v.x-p.x,y=v.y-p.y,x=Math.max(.001,Math.hypot(g,y));for(const i of[-1,1])n.push(t.x-y/x*r[o]*i,t.y+g/x*r[o]*i,0),a.push(t.distance),c.push(i);if(o){const i=(o-1)*2,l=o*2;w.push(i,i+1,l,i+1,l+1,l)}});const f=new C;return f.setAttribute("position",new b(new Float32Array(n),3)),f.setAttribute("aDistance",new b(new Float32Array(a),1)),f.setAttribute("aSide",new b(new Float32Array(c),1)),f.setIndex(w),f}return{resize(e,s){d||(m.setPixelRatio(Math.min(devicePixelRatio||1,e<=760?1:1.25)),m.setSize(e,s,!1),h.uViewport.value.set(e,s))},setRoute(e,s){d||[e.main,...e.branches.map(n=>n.path)].forEach((n,a)=>{const c=u[a].geometry;u[a].geometry=E(n,a===0?s?42:112:s?28:48),c.dispose(),u[a].material.uniforms.uLength.value=n.length})},render(e,s,n,a,c){d||(h.uTime.value=a,h.uScroll.value=n,h.uStrength.value=c,u[0].material.uniforms.uFrontier.value=s,e.branches.forEach((w,r)=>u[r+1].material.uniforms.uFrontier.value=Math.max(0,s-w.startDistance)),m.render(D,F))},dispose(){d||(d=!0,S.removeEventListener("webglcontextlost",L),u.forEach(e=>{e.geometry.dispose(),e.material.dispose()}),m.dispose())}}}export{j as createEnergyRibbon};
