import{n as T,S as k,O as I,f as P,p as _,V as z,Y as G,ak as O,M as W,r as C,X as M}from"./three.module.CxMWkkZZ.js";import{S as K}from"./silk-fabric.BpcHggaO.js";const N=["#e0e5ed","#ef6977","#e6c16e","#6cb8f3"];function $(b,B){const f=new T({canvas:b,alpha:!0,antialias:!1,powerPreference:"low-power",premultipliedAlpha:!0});f.setClearColor(0,0);const D=new k,F=new I(-1,1,1,-1,.1,3);F.position.z=1;const h={uTime:{value:0},uScroll:{value:0},uViewport:{value:new z(1,1)},uStrength:{value:0}},c=N.map((e,s)=>{const a=new P({transparent:!0,depthTest:!1,depthWrite:!1,side:O,blending:G,toneMapped:!1,uniforms:{...h,uColor:{value:new _(e)},uFrontier:{value:0},uLength:{value:1},uBranch:{value:s===0?0:1},uFocus:{value:0},uDeparture:{value:0}},vertexShader:`
    uniform vec2 uViewport;uniform float uScroll;
    attribute float aDistance,aSide;varying float vDistance,vSide;
    void main(){
     vDistance=aDistance;vSide=aSide;
     gl_Position=vec4(position.x/uViewport.x*2.0-1.0,1.0-(position.y-uScroll)/uViewport.y*2.0,0.0,1.0);
    }`,fragmentShader:`
    uniform float uTime,uStrength,uFrontier,uLength,uBranch,uFocus,uDeparture;uniform vec3 uColor;
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
     float absorption=mix(1.0,smoothstep(uDeparture*uLength-55.0,uDeparture*uLength+12.0,vDistance),step(.001,uDeparture));
     float alpha=silk*edge*reveal*ends*uStrength*(.96+.04*sin(uTime*.65))*(1.0+uFocus*1.25)*absorption;
     gl_FragColor=vec4(uColor,alpha*mix(.90,1.05,uBranch));
    }`}),r=new W(new C,a);return r.frustumCulled=!1,D.add(r),r});let d=!1;const L=e=>{e.preventDefault(),B()};b.addEventListener("webglcontextlost",L);function E(e,s){const a=[],r=[],l=[],x=[],n=e.samples.map((t,o)=>{const p=e.samples[Math.max(0,o-1)],v=e.samples[Math.min(e.samples.length-1,o+1)],g=t.x-p.x,y=t.y-p.y,w=v.x-t.x,i=v.y-t.y,m=Math.hypot(g,y),S=Math.hypot(w,i),A=m>.001&&S>.001?Math.acos(Math.max(-1,Math.min(1,(g*w+y*i)/(m*S)))):0,V=A>.001?(m+S)*.5/A:1e5,R=.07+.93*Math.pow(Math.max(0,Math.sin(t.distance/e.length*Math.PI)),.35);return Math.min(s*R,Math.max(2,V*.48))});for(let t=1;t<n.length;t++)n[t]=Math.min(n[t],n[t-1]+(e.samples[t].distance-e.samples[t-1].distance)*.32);for(let t=n.length-2;t>=0;t--)n[t]=Math.min(n[t],n[t+1]+(e.samples[t+1].distance-e.samples[t].distance)*.32);e.samples.forEach((t,o)=>{const p=e.samples[Math.max(0,o-1)],v=e.samples[Math.min(e.samples.length-1,o+1)],g=v.x-p.x,y=v.y-p.y,w=Math.max(.001,Math.hypot(g,y));for(const i of[-1,1])a.push(t.x-y/w*n[o]*i,t.y+g/w*n[o]*i,0),r.push(t.distance),l.push(i);if(o){const i=(o-1)*2,m=o*2;x.push(i,i+1,m,i+1,m+1,m)}});const u=new C;return u.setAttribute("position",new M(new Float32Array(a),3)),u.setAttribute("aDistance",new M(new Float32Array(r),1)),u.setAttribute("aSide",new M(new Float32Array(l),1)),u.setIndex(x),u}return{resize(e,s){d||(f.setPixelRatio(Math.min(devicePixelRatio||1,e<=760?1:1.25)),f.setSize(e,s,!1),h.uViewport.value.set(e,s))},setRoute(e,s){d||[e.main,...e.branches.map(a=>a.path)].forEach((a,r)=>{const l=c[r].geometry;c[r].geometry=E(a,r===0?s?42:112:s?28:48),l.dispose(),c[r].material.uniforms.uLength.value=a.length})},render(e,s,a,r,l,x){d||(h.uTime.value=l,h.uScroll.value=r,h.uStrength.value=x,c[0].material.uniforms.uFrontier.value=s,e.branches.forEach((n,u)=>c[u+1].material.uniforms.uFrontier.value=n.path.length*a[u]),f.render(D,F))},setInteraction(e,s){c.forEach((a,r)=>{const l=e>=0&&r===e+1;a.material.uniforms.uFocus.value+=(Number(l)-a.material.uniforms.uFocus.value)*.18,a.material.uniforms.uDeparture.value=l?s:0})},dispose(){d||(d=!0,b.removeEventListener("webglcontextlost",L),c.forEach(e=>{e.geometry.dispose(),e.material.dispose()}),f.dispose())}}}export{$ as createEnergyRibbon};
