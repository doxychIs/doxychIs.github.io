import{n as T,S as k,O as P,f as I,p as _,V as z,Y as G,ak as O,M as W,r as C,X as b}from"./three.module.CxMWkkZZ.js";import{S as K}from"./silk-fabric.BpcHggaO.js";const X=["#e0e5ed","#ef6977","#e6c16e","#6cb8f3"];function j(S,B){const h=new T({canvas:S,alpha:!0,antialias:!1,powerPreference:"low-power",premultipliedAlpha:!0});h.setClearColor(0,0);const D=new k,F=new P(-1,1,1,-1,.1,3);F.position.z=1;const d={uTime:{value:0},uScroll:{value:0},uViewport:{value:new z(1,1)},uStrength:{value:0}},c=X.map((e,r)=>{const n=new I({transparent:!0,depthTest:!1,depthWrite:!1,side:O,blending:G,toneMapped:!1,uniforms:{...d,uColor:{value:new _(e)},uFrontier:{value:0},uLength:{value:1},uBranch:{value:r===0?0:1}},vertexShader:`
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
    }`}),a=new W(new C,n);return a.frustumCulled=!1,D.add(a),a});let f=!1;const L=e=>{e.preventDefault(),B()};S.addEventListener("webglcontextlost",L);function E(e,r){const n=[],a=[],m=[],x=[],s=e.samples.map((t,o)=>{const p=e.samples[Math.max(0,o-1)],v=e.samples[Math.min(e.samples.length-1,o+1)],g=t.x-p.x,y=t.y-p.y,w=v.x-t.x,i=v.y-t.y,u=Math.hypot(g,y),M=Math.hypot(w,i),A=u>.001&&M>.001?Math.acos(Math.max(-1,Math.min(1,(g*w+y*i)/(u*M)))):0,V=A>.001?(u+M)*.5/A:1e5,R=.07+.93*Math.pow(Math.max(0,Math.sin(t.distance/e.length*Math.PI)),.35);return Math.min(r*R,Math.max(2,V*.48))});for(let t=1;t<s.length;t++)s[t]=Math.min(s[t],s[t-1]+(e.samples[t].distance-e.samples[t-1].distance)*.32);for(let t=s.length-2;t>=0;t--)s[t]=Math.min(s[t],s[t+1]+(e.samples[t+1].distance-e.samples[t].distance)*.32);e.samples.forEach((t,o)=>{const p=e.samples[Math.max(0,o-1)],v=e.samples[Math.min(e.samples.length-1,o+1)],g=v.x-p.x,y=v.y-p.y,w=Math.max(.001,Math.hypot(g,y));for(const i of[-1,1])n.push(t.x-y/w*s[o]*i,t.y+g/w*s[o]*i,0),a.push(t.distance),m.push(i);if(o){const i=(o-1)*2,u=o*2;x.push(i,i+1,u,i+1,u+1,u)}});const l=new C;return l.setAttribute("position",new b(new Float32Array(n),3)),l.setAttribute("aDistance",new b(new Float32Array(a),1)),l.setAttribute("aSide",new b(new Float32Array(m),1)),l.setIndex(x),l}return{resize(e,r){f||(h.setPixelRatio(Math.min(devicePixelRatio||1,e<=760?1:1.25)),h.setSize(e,r,!1),d.uViewport.value.set(e,r))},setRoute(e,r){f||[e.main,...e.branches.map(n=>n.path)].forEach((n,a)=>{const m=c[a].geometry;c[a].geometry=E(n,a===0?r?42:112:r?28:48),m.dispose(),c[a].material.uniforms.uLength.value=n.length})},render(e,r,n,a,m,x){f||(d.uTime.value=m,d.uScroll.value=a,d.uStrength.value=x,c[0].material.uniforms.uFrontier.value=r,e.branches.forEach((s,l)=>c[l+1].material.uniforms.uFrontier.value=s.path.length*n[l]),h.render(D,F))},dispose(){f||(f=!0,S.removeEventListener("webglcontextlost",L),c.forEach(e=>{e.geometry.dispose(),e.material.dispose()}),h.dispose())}}}export{j as createEnergyRibbon};
