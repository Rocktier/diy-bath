/**
 * 3D 视图：把 Part[] 渲染成可轨道旋转的场景。
 *
 * 与 project.js 的关系：
 *   project.js 把 Part[] 投影成 2D 图元（正/俯/剖）
 *   three-view.js 把同一份 Part[] 变成 3D 场景
 *
 * 两边共用 parts.js 的输出，所以**几何永远一致**——
 * 不存在「2D 图上 6 个抽屉、3D 里 4 个」这种事。
 *
 * 参照图是白模，所以这里坚持纯色 + 描边，不用贴图。
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { parts } from './parts.js';
import { partToWorld, colorOf, isVisible, NEEDS_EDGE, CAMERA_Y_SIGN } from './world.js';

/** 台面之外的默认取景参数 */
const DEFAULT_VIEW = {
  fov: 38,
  /** 相机到目标的距离 */
  distance: 2400,
  /** 俯仰角（度）。正值俯视，参照图是从略高处往下看 */
  pitch: -18,
  /** 方位角（度）。0 = 正对柜面 */
  yaw: 28,
};

export class ThreeView {
  /**
   * @param {HTMLDivElement} container 承载画布的容器
   */
  constructor(container) {
    this.container = container;
    this.spec = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.group = null;
    this.ro = null;
    this._raf = null;
    this._disposed = false;
    this._lastW = 0;
    this._lastH = 0;

    this._initRenderer();
    this._initScene();

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    // 只有用户真的在转/缩放时才持续渲染。
    // 静止时不占 CPU，否则一个空窗口就能吃掉一个核。
    this._needsRender = true;
    this._tick = this._tick.bind(this);
    this._raf = requestAnimationFrame(this._tick);
  }

  _initRenderer() {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.setClearColor(0xffffff, 1);
    this.renderer = r;
    this.container.appendChild(r.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.camera = new THREE.PerspectiveCamera(
      DEFAULT_VIEW.fov, 1, 1, 20000,
    );

    // 环境光打底，避免背光面纯黑
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.5));

    // 主光：从左上前方来，和参照图的高光方向一致
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-1200, 2200, 1800);
    this.scene.add(key);

    // 补光：右后方弱一点，勾出轮廓
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(1600, 800, -1200);
    this.scene.add(fill);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.7;
    this.controls.minDistance = 400;
    this.controls.maxDistance = 12000;
    // 不许转到柜体下面去，那视角没有意义
    this.controls.maxPolarAngle = Math.PI * 0.52;

    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  /** 重新按 spec 生成场景 */
  setSpec(spec) {
    if (this._disposed) return;
    this.spec = spec;

    // 清掉旧场景。dispose 不调的话显存会一直涨，
    // 改十几次参数就该重开应用了。
    for (let i = this.group.children.length - 1; i >= 0; i--) {
      const c = this.group.children[i];
      this.group.remove(c);
      c.geometry?.dispose?.();
      if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
      else c.material?.dispose?.();
    }

    const ps = parts(spec).filter((p) => isVisible(p.kind));
    for (const p of ps) this._addPart(p);
    this._addGround(spec);

    this._frameCamera();
    this._needsRender = true;
  }

  _addPart(p) {
    const w = partToWorld(p);
    const geo = new THREE.BoxGeometry(w.size.x, w.size.y, w.size.z);
    const mat = new THREE.MeshLambertMaterial({ color: colorOf(p.kind) });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(w.position.x, w.position.y, w.position.z);
    this.group.add(mesh);

    if (NEEDS_EDGE.has(p.kind)) {
      const eg = new THREE.EdgesGeometry(geo);
      const em = new THREE.LineBasicMaterial({ color: 0x6b6862 });
      const edge = new THREE.LineSegments(eg, em);
      edge.position.copy(mesh.position);
      this.group.add(edge);
    }
  }

  /** 地面。参照图能看到影子，没有地面就完全浮空。 */
  _addGround(spec) {
    const w = spec.cabinet.width;
    const d = spec.cabinet.depth;
    const geo = new THREE.PlaneGeometry(w * 4, d * 6);
    const mat = new THREE.MeshLambertMaterial({ color: 0xf2f0ec });
    const g = new THREE.Mesh(geo, mat);
    g.rotation.x = -Math.PI / 2;
    g.position.set(w / 2, -1, -(d / 2));
    this.group.add(g);
  }

  /** 让相机对准柜体中心 */
  _frameCamera() {
    const s = this.spec;
    const cx = s.cabinet.width / 2;
    const cy = s.cabinet.height / 2;
    const cz = -s.cabinet.depth / 2;

    const dist = DEFAULT_VIEW.distance * Math.max(s.cabinet.width, s.cabinet.height) / 1180;
    const pitch = THREE.MathUtils.degToRad(DEFAULT_VIEW.pitch);
    // z 取反是镜像，场景转向会与鼠标手势相反，所以方位角也取反
    const yaw = THREE.MathUtils.degToRad(DEFAULT_VIEW.yaw) * CAMERA_Y_SIGN;

    this.camera.position.set(
      cx + dist * Math.cos(pitch) * Math.sin(yaw),
      cy - dist * Math.sin(pitch),
      cz + dist * Math.cos(pitch) * Math.cos(yaw),
    );
    this.camera.lookAt(cx, cy, cz);
    this.controls.target.set(cx, cy, cz);
    this.controls.update();
  }

  /** 重置到默认视角 */
  reset() {
    if (this.spec) this._frameCamera();
    this._needsRender = true;
  }

  /** 导出当前视角的 PNG */
  snapshot() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  _tick() {
    if (this._disposed) return;
    this._raf = requestAnimationFrame(this._tick);

    // 有阻尼，控制器在动的时候需要多渲染几帧才停
    if (this.controls.update()) this._needsRender = true;
    if (!this._needsRender) return;

    this.renderer.render(this.scene, this.camera);
    this._needsRender = false;
  }

  /** 手动指定画布尺寸。容器刚从 display:none 显示出来时必须调，否则画面是错的。 */
  resize(w, h) {
    if (!w || !h) return;
    if (w === this._lastW && h === this._lastH) return;
    this._lastW = w;
    this._lastH = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._needsRender = true;
  }

  _onResize() {
    this.resize(this.container.clientWidth, this.container.clientHeight);
  }

  dispose() {
    this._disposed = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    this.controls?.dispose?.();
    for (const c of this.group?.children ?? []) {
      c.geometry?.dispose?.();
      if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
      else c.material?.dispose?.();
    }
    this.renderer?.dispose?.();
    this.renderer?.domElement?.remove?.();
  }
}
