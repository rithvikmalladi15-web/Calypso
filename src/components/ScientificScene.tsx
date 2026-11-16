import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { isLocal, reading, zone, type Sensor } from '../simulation/sensorModel'
import { initial, type Point } from '../simulation/engine'
import { download } from '../lib/chartDownloads'

export type SceneProps = {
  kind:'cabin'|'body'; point?:Point; sensors?:Sensor[]; hidden?:boolean; heat?:boolean; noise?:number;
  environmentalExposure?:number; selectedSystem?:number; onSystem?:(index:number)=>void; onSensor?:(id:string)=>void; onUnavailable:()=>void;
}
const systemNames=['Brain & balance','Eyes','Lungs','Heart & circulation','Kidneys','Muscles','Bones']
export const sensorPosition=(sensor:Pick<Sensor,'x'|'y'>)=>[(sensor.x-.5)*6,(.5-sensor.y)*3.525,.4] as const

export default function ScientificScene(props:SceneProps) {
  const host=useRef<HTMLDivElement>(null)
  const current=useRef(props);current.current=props
  const actions=useRef<{rotate:(angle:number)=>void;zoom:(factor:number)=>void;reset:()=>void;update:()=>void;export:()=>Promise<void>}|null>(null)
  const [status,setStatus]=useState('')
  useEffect(()=>{
    const container=host.current
    if(!container)return
    if(typeof WebGL2RenderingContext==='undefined'){current.current.onUnavailable();return}
    const canvas=document.createElement('canvas')
    let renderer:THREE.WebGLRenderer
    try {
      const context=canvas.getContext('webgl2',{antialias:true,alpha:false})
      if(!context){current.current.onUnavailable();return}
      renderer=new THREE.WebGLRenderer({canvas,context,antialias:true})
    } catch {current.current.onUnavailable();return}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5))
    renderer.setClearColor('#080e16')
    renderer.outputColorSpace=THREE.SRGBColorSpace
    canvas.setAttribute('aria-label',props.kind==='cabin'?'Interactive conceptual 3D cabin':'Interactive illustrative 3D body')
    canvas.setAttribute('role','img');canvas.tabIndex=0
    container.appendChild(canvas)
    const scene=new THREE.Scene()
    const camera=new THREE.PerspectiveCamera(40,1,.1,50)
    const controls=new OrbitControls(camera,canvas)
    controls.enablePan=false;controls.enableDamping=false;controls.minDistance=3;controls.maxDistance=12
    controls.minPolarAngle=.35;controls.maxPolarAngle=Math.PI-.35
    const home=props.kind==='cabin'?new THREE.Vector3(3,1.6,7):new THREE.Vector3(1.1,.5,6)
    controls.target.set(0,0,0)
    scene.add(new THREE.HemisphereLight('#d6e7ff','#233144',2.4))
    const light=new THREE.DirectionalLight('#ffffff',3);light.position.set(3,5,6);scene.add(light)
    const rim=new THREE.DirectionalLight('#80b7e8',2);rim.position.set(-4,2,-2);scene.add(rim)
    const pickable:THREE.Object3D[]=[]
    const materials:THREE.Material[]=[]
    const material=(color:string,opacity=1)=>{
      const mat=new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.12,transparent:opacity<1,opacity,depthWrite:opacity===1})
      materials.push(mat);return mat
    }
    const suit=material(props.kind==='cabin'?'#c4d2df':'#4a8b9a',props.kind==='cabin'?1:.18)
    const joint=material('#35495d',props.kind==='cabin'?1:.22)
    function ellipsoid(parent:THREE.Object3D,x:number,y:number,z:number,sx:number,sy:number,sz:number,mat:THREE.Material){
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh
    }
    function box(parent:THREE.Object3D,x:number,y:number,z:number,sx:number,sy:number,sz:number,mat:THREE.Material){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh
    }
    function limb(parent:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,radius:number,mat:THREE.Material){
      const delta=b.clone().sub(a);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius*.85,radius,delta.length(),16),mat)
      mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());parent.add(mesh);return mesh
    }
    const person=new THREE.Group();scene.add(person)
    ellipsoid(person,0,.2,0,.38,.55,.23,suit)
    ellipsoid(person,0,-.35,0,.32,.23,.22,suit)
    ellipsoid(person,0,.93,0,.24,.3,.23,suit)
    limb(person,new THREE.Vector3(0,.52,0),new THREE.Vector3(0,.72,0),.1,joint)
    for(const sign of [-1,1]){
      limb(person,new THREE.Vector3(sign*.34,.5,0),new THREE.Vector3(sign*.55,-.05,.02),.115,suit)
      limb(person,new THREE.Vector3(sign*.55,-.05,.02),new THREE.Vector3(sign*.61,-.48,.1),.09,suit)
      ellipsoid(person,sign*.62,-.55,.1,.09,.13,.08,suit)
      limb(person,new THREE.Vector3(sign*.17,-.4,0),new THREE.Vector3(sign*.2,-.94,0),.14,suit)
      ellipsoid(person,sign*.2,-.96,0,.12,.12,.12,joint)
      limb(person,new THREE.Vector3(sign*.2,-1.01,0),new THREE.Vector3(sign*.21,-1.52,0),.1,suit)
      ellipsoid(person,sign*.21,-1.58,.1,.12,.1,.23,joint)
    }
    const organMeshes:{mesh:THREE.Mesh;index:number}[]=[]
    const sensorMeshes=new Map<string,THREE.Mesh>()
    let zoneMesh:THREE.Mesh|undefined
    if(props.kind==='cabin'){
      const face=material('#c9a98e')
      ellipsoid(person,0,.92,.12,.185,.235,.17,face)
      ellipsoid(person,0,.9,.29,.035,.055,.035,face)
      const eyes=material('#1c2632')
      for(const sign of [-1,1])ellipsoid(person,sign*.07,.99,.266,.018,.014,.012,eyes)
      box(person,0,.18,.24,.27,.23,.05,joint)
      const [x,y]=sensorPosition(zone);person.position.set(x,y-.9,.08)
      const cabinMat=material('#162331'),floorMat=material('#1d3040')
      box(scene,0,-1.85,-.15,6,.08,3.5,floorMat)
      box(scene,0,0,-1.85,6,3.7,.08,cabinMat)
      for(const sign of [-1,1]){
        box(scene,sign*2.65,-.15,-1.45,.42,2.9,.5,joint)
        for(let i=0;i<5;i++)box(scene,sign*2.65,-1.1+i*.48,-1.17,.32,.32,.04,floorMat)
      }
      const edges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(6,3.7,3.5)),new THREE.LineBasicMaterial({color:'#46627c',transparent:true,opacity:.55}));edges.position.z=-.1;scene.add(edges)
      const grid=new THREE.GridHelper(6,12,'#3a5368','#22374a');grid.position.set(0,-1.8,-.1);scene.add(grid)
      zoneMesh=ellipsoid(scene,x,y,.4,zone.radius*6,zone.radius*3.525,.32,material('#80b7e8',.12))
      const outline=new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(1,16,10)),new THREE.LineBasicMaterial({color:'#80b7e8',transparent:true,opacity:.35}));zoneMesh.add(outline)
    } else {
      function organ(index:number,x:number,y:number,z:number,sx:number,sy:number,sz:number){
        const mesh=ellipsoid(person,x,y,z,sx,sy,sz,material('#6fabc2'));mesh.userData.system=index;pickable.push(mesh);organMeshes.push({mesh,index})
      }
      organ(0,0,1.04,.05,.17,.14,.16)
      for(const sign of [-1,1]){
        organ(1,sign*.07,.98,.22,.035,.03,.025)
        organ(2,sign*.16,.32,.04,.13,.24,.14)
        organ(4,sign*.17,-.15,-.07,.065,.105,.055)
        organ(5,sign*.49,.13,.02,.09,.2,.09)
        organ(5,sign*.19,-.68,.02,.11,.22,.1)
        organ(6,sign*.21,-1.25,.03,.035,.23,.035)
      }
      organ(3,.06,.18,.16,.09,.12,.08)
      organ(6,0,-.12,0,.035,.42,.035)
      const grid=new THREE.GridHelper(4,12,'#375667','#192c38');grid.position.y=-1.7;scene.add(grid)
    }
    function render(){renderer.render(scene,camera)}
    function reset(){camera.position.copy(home);controls.target.set(0,0,0);controls.update();render()}
    function rotate(angle:number){const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),angle);camera.position.copy(controls.target).add(offset);controls.update();render()}
    function zoom(factor:number){const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();render()}
    function update(){
      const latest=current.current
      if(zoneMesh){
        zoneMesh.visible=!latest.hidden
        const mat=zoneMesh.material as THREE.MeshStandardMaterial
        mat.opacity=latest.heat?Math.min(.28,.06+Math.max(0,(latest.point??initial).local-(latest.point??initial).cabin)/9000):.025
      }
      for(const {mesh,index} of organMeshes){
        const mat=mesh.material as THREE.MeshStandardMaterial;const exposure=index===2&&(latest.environmentalExposure??0)>=1;mat.color.set(exposure?'#d4a44f':index===latest.selectedSystem?'#b7e2f1':'#639bad');mat.emissive.set(exposure?'#332719':'#000000')
      }
      const sensors=latest.sensors??[]
      for(const [id,mesh] of sensorMeshes)if(!sensors.some(sensor=>sensor.id===id)){
        scene.remove(mesh);mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();pickable.splice(pickable.indexOf(mesh),1);sensorMeshes.delete(id)
      }
      for(const sensor of sensors){
        let mesh=sensorMeshes.get(sensor.id)
        if(!mesh){mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.09),new THREE.MeshStandardMaterial({color:'#80b7e8',emissive:'#163a55',roughness:.35}));mesh.userData.sensor=sensor.id;scene.add(mesh);sensorMeshes.set(sensor.id,mesh);pickable.push(mesh)}
        mesh.position.set(...sensorPosition(sensor));mesh.visible=!latest.hidden||!isLocal(sensor)
      }
      render()
    }
    const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();let down={x:0,y:0}
    function pointerDown(event:PointerEvent){down={x:event.clientX,y:event.clientY}}
    function pointerUp(event:PointerEvent){
      if(Math.hypot(event.clientX-down.x,event.clientY-down.y)>6)return
      const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera)
      const hit=raycaster.intersectObjects(pickable.filter(item=>item.visible),false)[0]?.object
      if(hit?.userData.system!=null){current.current.onSystem?.(hit.userData.system);setStatus(systemNames[hit.userData.system])}
      if(hit?.userData.sensor){current.current.onSensor?.(hit.userData.sensor);setStatus('Selected sensor '+hit.userData.sensor)}
    }
    function keyboard(event:KeyboardEvent){
      const handler:Record<string,()=>void>={ArrowLeft:()=>rotate(-.2),ArrowRight:()=>rotate(.2),'+':()=>zoom(.85),'=':()=>zoom(.85),'-':()=>zoom(1.15),Home:reset}
      if(handler[event.key]){event.preventDefault();handler[event.key]()}
    }
    function contextLost(event:Event){event.preventDefault();current.current.onUnavailable()}
    controls.addEventListener('change',render)
    canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('keydown',keyboard);canvas.addEventListener('webglcontextlost',contextLost)
    const resize=new ResizeObserver(()=>{
      const width=container.clientWidth,height=container.clientHeight
      if(!width||!height)return
      renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();render()
    });resize.observe(container)
    actions.current={rotate,zoom,reset,update,export:async()=>{
      render()
      const output=document.createElement('canvas');output.width=canvas.width;output.height=canvas.height
      const ctx=output.getContext('2d');if(!ctx)throw new Error('Image export unavailable')
      ctx.drawImage(canvas,0,0);ctx.fillStyle='rgba(220,231,242,.85)';ctx.font=`${Math.max(13,canvas.width/70)}px sans-serif`;ctx.textAlign='right';ctx.fillText('Made by AI · Conceptual 3D illustration',canvas.width-14,canvas.height-16)
      const blob=await new Promise<Blob|null>(resolve=>output.toBlob(resolve,'image/png'));if(!blob)throw new Error('Image export unavailable');download(blob,`calypso-${props.kind}-3d.png`)
    }}
    reset();update()
    return ()=>{
      actions.current=null;resize.disconnect();controls.dispose()
      canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('keydown',keyboard);canvas.removeEventListener('webglcontextlost',contextLost)
      const disposed=new Set<THREE.Material>()
      scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.LineSegments||object instanceof THREE.GridHelper){object.geometry.dispose();for(const mat of Array.isArray(object.material)?object.material:[object.material]){if(!disposed.has(mat)){mat.dispose();disposed.add(mat)}}}})
      for(const mat of materials)if(!disposed.has(mat))mat.dispose()
      renderer.dispose();renderer.forceContextLoss();canvas.remove()
    }
  },[props.kind])
  useEffect(()=>{actions.current?.update()},[props.point,props.sensors,props.hidden,props.heat,props.selectedSystem,props.environmentalExposure])
  return <div className="scientific-3d">
    <div ref={host} className="scene-canvas"/>
    <span className="ai-image-credit">Made by AI · Conceptual 3D illustration</span>
    <div className="scene-tools" role="group" aria-label={props.kind+' 3D view controls'}>
      <button onClick={()=>actions.current?.rotate(-.25)} aria-label={'Rotate '+props.kind+' left'}>↶ Rotate</button><button onClick={()=>actions.current?.rotate(.25)} aria-label={'Rotate '+props.kind+' right'}>Rotate ↷</button>
      <button onClick={()=>actions.current?.zoom(.85)} aria-label={'Zoom '+props.kind+' in'}>+</button><button onClick={()=>actions.current?.zoom(1.15)} aria-label={'Zoom '+props.kind+' out'}>−</button><button onClick={()=>actions.current?.reset()}>Reset view</button>
      <button data-export-3d onClick={()=>void actions.current?.export().catch(()=>setStatus('Image export unavailable. Try the 2D schematic.'))}>Save 3D image</button>
    </div>
    <p className="scene-help">Drag to rotate · Pinch or scroll to zoom. Keyboard: ← → rotate, + / − zoom, Home resets. {props.kind==='body'?'Select an organ or use the body-system buttons below.':'Select a blue sensor marker or use the sensor controls.'}</p>
    {props.kind==='cabin'&&<div className="scene-sensors">{(props.sensors??[]).filter(sensor=>!props.hidden||!isLocal(sensor)).map(sensor=><button key={sensor.id} onClick={()=>props.onSensor?.(sensor.id)}>{sensor.id} · {isLocal(sensor)?'Breathing zone':'Cabin'} · {Math.round(reading(props.point??initial,sensor,props.noise)).toLocaleString()} ppm</button>)}</div>}
    <span role="status" className="sr-only">{status}</span>
  </div>
}
