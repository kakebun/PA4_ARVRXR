/* PA4 — Sultan Mykhtybayev, ID 241280 → prefix x1280-
   Variant: 0 → Space station | 8 mod 3 = 2 → pulse | 2 mod 2 = 0 → gaze 1.5 s | 1 mod 2 = 1 → corridor */

(function () {
  'use strict';

  var TWO_PI = Math.PI * 2;

  // Read position/scale even if that component is not initialised yet
  function readVec3(el, name, fallback) {
    if (el.components[name]) { return el.object3D[name].clone(); }
    var raw = window.HTMLElement.prototype.getAttribute.call(el, name);
    if (!raw) { return fallback.clone(); }
    var p = AFRAME.utils.coordinates.parse(raw);
    return new THREE.Vector3(
      p.x !== undefined ? p.x : fallback.x,
      p.y !== undefined ? p.y : fallback.y,
      p.z !== undefined ? p.z : fallback.z);
  }

  /* ================= SYSTEM x1280-gallery ================= */
  AFRAME.registerSystem('x1280-gallery', {
    init: function () {
      this.exhibits = [];
      this.selected = null;
      this.motionPaused = false;
      this.onKeyDown = this.onKeyDown.bind(this);
      window.addEventListener('keydown', this.onKeyDown);
      var self = this;
      this.el.addEventListener('loaded', function () { self.updatePanel(); });
    },

    remove: function () {
      window.removeEventListener('keydown', this.onKeyDown);
    },

    onKeyDown: function (e) {
      if (e.repeat) { return; }
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) { return; }
      if (e.code === 'KeyM') { this.toggleMotion(); }     // works on RU layout too
      if (e.code === 'KeyX') { this.removeSelected(); }
    },

    register: function (el) {
      if (this.exhibits.indexOf(el) !== -1) { return; }
      this.exhibits.push(el);
      if (this.motionPaused) {
        var self = this;
        var pauseIt = function () { self.setMotion(el, false); };
        if (el.hasLoaded) { pauseIt(); } else { el.addEventListener('loaded', pauseIt, {once: true}); }
      }
      this.updatePanel();
    },

    unregister: function (el) {
      var i = this.exhibits.indexOf(el);
      if (i !== -1) { this.exhibits.splice(i, 1); }
      if (this.selected === el) { this.selected = null; }
      this.updatePanel();
    },

    // only one selected exhibit at a time
    select: function (el) {
      var prev = this.selected;
      if (prev === el) {
        this.setSelected(el, false);
        this.selected = null;
      } else {
        if (prev) { this.setSelected(prev, false); }
        this.selected = el;
        this.setSelected(el, true);
      }
      this.updatePanel();
      this.el.emit('x1280-selectionchanged', {selected: this.selected});
    },

    setSelected: function (el, on) {
      var comp = el.components['x1280-exhibit'];
      if (comp) { comp.setSelected(on); }
    },

    // Key M
    toggleMotion: function () {
      this.motionPaused = !this.motionPaused;
      for (var i = 0; i < this.exhibits.length; i++) {
        this.setMotion(this.exhibits[i], !this.motionPaused);
      }
      this.updatePanel();
    },

    setMotion: function (el, running) {
      var motion = el.components['x1280-motion'];
      if (!motion) { return; }
      if (running) { motion.play(); } else { motion.pause(); }
    },

    // Key X
    removeSelected: function () {
      var el = this.selected;
      if (!el) { console.info('[x1280-gallery] nothing selected, X ignored'); return; }
      if (el.parentNode) { el.parentNode.removeChild(el); }
    },

    updatePanel: function () {
      var panel = document.getElementById('x1280-status');
      if (!panel) { return; }
      var total = this.exhibits.length;
      var name = 'none';
      var n = 0;
      if (this.selected) {
        n = this.exhibits.indexOf(this.selected) + 1;
        name = this.selected.getAttribute('x1280-exhibit').name;
      }
      panel.setAttribute('text', 'value',
        'Selected: ' + name + ' (' + n + ' of ' + total + ')\n' +
        'Motion: ' + (this.motionPaused ? 'PAUSED' : 'running') +
        '   [M] pause/resume   [X] remove selected');
    }
  });

  /* ================= COMPONENT x1280-motion (pulse) ================= */
  AFRAME.registerComponent('x1280-motion', {
    schema: {
      type: {type: 'string', default: 'pulse', oneOf: ['bob', 'orbit', 'pulse']},
      amplitude: {type: 'number', default: 0.12, min: 0},
      period: {type: 'number', default: 3, min: 0.1},   // seconds
      phase: {type: 'number', default: 0},              // radians
      log: {type: 'boolean', default: false}            // E1 logging
    },

    init: function () {
      this.basePosition = readVec3(this.el, 'position', new THREE.Vector3(0, 0, 0));
      this.baseScale = readVec3(this.el, 'scale', new THREE.Vector3(1, 1, 1));
      this.angle = 0;
      this.currentAmplitude = this.data.amplitude;
      this.loggedTick = false;
      this.gallery = this.el.sceneEl.systems['x1280-gallery'];
      this.log('init', {basePosition: this.basePosition.toArray(), baseScale: this.baseScale.toArray()});
    },

    update: function (oldData) {
      this.log('update', {oldData: AFRAME.utils.extend({}, oldData), data: AFRAME.utils.extend({}, this.data)});
      var first = Object.keys(oldData).length === 0;
      if (first) {
        this.currentAmplitude = this.data.amplitude;
        this.applyPose();
        return;
      }
      if (oldData.type !== this.data.type) {
        this.restoreBase();
        this.applyPose();
      }
      // amplitude is eased in tick, period only changes speed → no jump
    },

    tick: function (time, timeDelta) {
      if (!this.loggedTick) { this.log('tick (first after play)', {time: time, timeDelta: timeDelta}); this.loggedTick = true; }
      if (this.gallery && this.gallery.motionPaused && this.el.classList.contains('exhibit')) { return; }
      var dt = Math.min(timeDelta, 100) / 1000;
      this.angle = (this.angle + TWO_PI * dt / this.data.period) % TWO_PI;
      this.currentAmplitude += (this.data.amplitude - this.currentAmplitude) * (1 - Math.exp(-dt / 0.25));
      this.applyPose();
    },

    applyPose: function () {
      var o = this.el.object3D;
      var a = this.currentAmplitude;
      var t = this.angle + this.data.phase;
      var bp = this.basePosition;
      var bs = this.baseScale;
      switch (this.data.type) {
        case 'bob':
          o.position.set(bp.x, bp.y + a * Math.sin(t), bp.z);
          break;
        case 'orbit':
          o.position.set(bp.x + a * Math.cos(t), bp.y, bp.z + a * Math.sin(t));
          break;
        default: // pulse
          var f = 1 + a * Math.sin(t);
          o.scale.set(bs.x * f, bs.y * f, bs.z * f);
      }
    },

    restoreBase: function () {
      this.el.object3D.position.copy(this.basePosition);
      this.el.object3D.scale.copy(this.baseScale);
    },

    pause: function () { this.log('pause'); },

    play: function () {
      this.loggedTick = false;
      this.log('play');
    },

    remove: function () {
      this.restoreBase();
      this.log('remove (base pose restored)');
    },

    log: function (what, extra) {
      if (!this.data || !this.data.log) { return; }
      console.log('[x1280-motion] t=' + performance.now().toFixed(1) + ' ms  ' + what +
        '  #' + (this.el.id || '(no id)'), extra !== undefined ? extra : '');
    }
  });

  /* ================= COMPONENT x1280-texture ================= */
  AFRAME.registerComponent('x1280-texture', {
    schema: {
      src: {type: 'map'},
      repeat: {type: 'vec2', default: {x: 1, y: 1}},
      normalSrc: {type: 'map', default: ''},
      anisotropy: {type: 'number', default: 8}
    },

    init: function () {
      // runtime objects live on this, not in this.data
      this.mesh = null;
      this.texture = null;
      this.normalTexture = null;
      this.material = null;
      this.originalMaterial = null;
      this.loader = new THREE.TextureLoader();

      this.onObject3DSet = this.onObject3DSet.bind(this);
      var mesh = this.el.getObject3D('mesh');
      if (mesh) {
        this.setMesh(mesh, false);
      } else {
        this.el.addEventListener('object3dset', this.onObject3DSet);
      }
    },

    onObject3DSet: function (evt) {
      if (evt.target !== this.el || evt.detail.type !== 'mesh') { return; }
      this.el.removeEventListener('object3dset', this.onObject3DSet);
      this.setMesh(this.el.getObject3D('mesh'), true);
    },

    setMesh: function (mesh, loadNow) {
      this.mesh = mesh;
      this.originalMaterial = mesh.material;
      this.material = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.75, metalness: 0.25});
      mesh.material = this.material;
      if (loadNow) {
        this.setTexture('map', this.data.src);
        this.setTexture('normalMap', this.data.normalSrc);
      }
    },

    update: function (oldData) {
      if (!this.mesh) { return; }
      var d = this.data;
      if (d.src !== oldData.src) { this.setTexture('map', d.src); }   // reload only on src change
      if (d.normalSrc !== oldData.normalSrc) { this.setTexture('normalMap', d.normalSrc); }
      if (this.texture) { this.configure(this.texture); }
      if (this.normalTexture) { this.configure(this.normalTexture); }
    },

    setTexture: function (slot, src) {
      var key = slot === 'map' ? 'texture' : 'normalTexture';
      if (this[key]) { this[key].dispose(); this[key] = null; }
      var tex = null;
      if (src) {
        if (src instanceof window.HTMLImageElement || src instanceof window.HTMLCanvasElement) {
          tex = new THREE.Texture(src);
          if (src.complete === false) {
            src.addEventListener('load', function () { tex.needsUpdate = true; }, {once: true});
          } else {
            tex.needsUpdate = true;
          }
        } else {
          tex = this.loader.load(src);
        }
        tex.colorSpace = slot === 'map' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        this.configure(tex);
      }
      this[key] = tex;
      this.material[slot] = tex;
      this.material.needsUpdate = true;
    },

    // real Three.js properties; mipmaps + trilinear + anisotropy reduce shimmer
    configure: function (tex) {
      var renderer = this.el.sceneEl.renderer;
      var maxAniso = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(this.data.repeat.x, this.data.repeat.y);
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = Math.max(1, Math.min(this.data.anisotropy, maxAniso));
      tex.needsUpdate = true;
    },

    remove: function () {
      this.el.removeEventListener('object3dset', this.onObject3DSet);
      if (this.texture) { this.texture.dispose(); }
      if (this.normalTexture) { this.normalTexture.dispose(); }
      if (this.material) { this.material.dispose(); }
      if (this.mesh && this.originalMaterial) { this.mesh.material = this.originalMaterial; }
      this.texture = this.normalTexture = this.material = this.originalMaterial = this.mesh = null;
    }
  });

  /* ================= COMPONENT x1280-exhibit ================= */
  AFRAME.registerComponent('x1280-exhibit', {
    schema: {
      name: {type: 'string', default: 'Exhibit'},
      info: {type: 'string', default: ''},
      hoverColor: {type: 'color', default: '#2f8cff'},
      selectColor: {type: 'color', default: '#ffb300'},
      panelHeight: {type: 'number', default: 0.95}
    },

    init: function () {
      this.gallery = this.el.sceneEl.systems['x1280-gallery'];
      this.hovered = false;
      this.selected = false;
      this.original = null;
      this.motionBackup = null;
      this.panel = null;
      this.tmpA = new THREE.Vector3();
      this.tmpB = new THREE.Vector3();
      this.gallery.register(this.el);
    },

    events: {
      mouseenter: function (evt) {
        if (evt.target !== this.el) { return; }
        this.hovered = true;
        this.refreshLook();
      },
      mouseleave: function (evt) {
        if (evt.target !== this.el) { return; }
        this.hovered = false;
        this.refreshLook();
      },
      click: function (evt) {
        if (evt.target !== this.el) { return; }
        this.gallery.select(this.el);
      }
    },

    refreshLook: function () {
      if (!this.original) {
        var m = this.el.getAttribute('material') || {};
        this.original = {emissive: m.emissive || '#000000', emissiveIntensity: m.emissiveIntensity !== undefined ? m.emissiveIntensity : 1};
      }
      var look;
      if (this.selected) { look = {emissive: this.data.selectColor, emissiveIntensity: 0.9}; }
      else if (this.hovered) { look = {emissive: this.data.hoverColor, emissiveIntensity: 0.9}; }
      else { look = this.original; }
      this.el.setAttribute('material', look);
    },

    setSelected: function (on) {
      if (this.selected === on) { return; }
      this.selected = on;
      var motion = this.el.getAttribute('x1280-motion');
      if (on) {
        if (motion) {
          this.motionBackup = {amplitude: motion.amplitude, period: motion.period};
          this.el.setAttribute('x1280-motion', {amplitude: motion.amplitude * 2, period: motion.period / 2});
        }
        this.showPanel();
      } else {
        if (motion && this.motionBackup) {
          this.el.setAttribute('x1280-motion', this.motionBackup);
          this.motionBackup = null;
        }
        this.hidePanel();
      }
      this.refreshLook();
    },

    showPanel: function () {
      this.hidePanel();
      var p = this.el.object3D.getWorldPosition(this.tmpA);
      var panel = document.createElement('a-entity');
      panel.classList.add('x1280-infopanel');
      panel.setAttribute('position', {x: p.x, y: p.y + this.data.panelHeight, z: p.z});
      panel.setAttribute('geometry', {primitive: 'plane', width: 1.7, height: 0.48});
      panel.setAttribute('material', {shader: 'flat', color: '#0b1630', opacity: 0.85, transparent: true});
      panel.setAttribute('text', {
        value: this.data.name.toUpperCase() + '\n' + this.data.info,
        align: 'center', color: '#e8f4ff', width: 1.6, wrapCount: 36
      });
      this.el.sceneEl.appendChild(panel);
      this.panel = panel;
    },

    hidePanel: function () {
      if (this.panel && this.panel.parentNode) { this.panel.parentNode.removeChild(this.panel); }
      this.panel = null;
    },

    tick: function () {
      if (!this.panel || !this.panel.object3D) { return; }
      var cam = this.el.sceneEl.camera;
      if (!cam) { return; }
      cam.getWorldPosition(this.tmpB);
      var po = this.panel.object3D;
      this.tmpB.y = po.position.y;
      po.lookAt(this.tmpB);
    },

    remove: function () {
      this.hidePanel();
      this.gallery.unregister(this.el);
    }
  });

  /* ================= Console helpers for the write-up ================= */

  // E5: +60 exhibits
  window.x1280Spawn = function (count) {
    count = count || 60;
    var scene = document.querySelector('a-scene');
    var holder = document.getElementById('x1280-spawned');
    if (!holder) {
      holder = document.createElement('a-entity');
      holder.id = 'x1280-spawned';
      scene.appendChild(holder);
    }
    var shapes = [
      'primitive: box; width: 0.35; height: 0.35; depth: 0.35',
      'primitive: sphere; radius: 0.22',
      'primitive: octahedron; radius: 0.22',
      'primitive: dodecahedron; radius: 0.22',
      'primitive: icosahedron; radius: 0.22',
      'primitive: cylinder; radius: 0.18; height: 0.4'
    ];
    for (var i = 0; i < count; i++) {
      var e = document.createElement('a-entity');
      var col = i % 10;
      var row = Math.floor(i / 10);
      e.classList.add('exhibit');
      e.setAttribute('position', (col - 4.5) * 0.8 + ' ' + (0.6 + row * 0.7) + ' -17');
      e.setAttribute('geometry', shapes[i % shapes.length]);
      e.setAttribute('material', 'color: #' + (0x3080ff + i * 0x0a1203).toString(16).slice(-6) + '; metalness: 0.4; roughness: 0.5');
      e.setAttribute('x1280-motion', 'phase: ' + (i * 0.37).toFixed(2));
      e.setAttribute('x1280-exhibit', 'name: Sample ' + (i + 1) + '; info: Spawned by script for E5');
      holder.appendChild(e);
    }
    return count + ' exhibits spawned';
  };

  // E5 optimisation: 60 objects in ONE draw call
  window.x1280SpawnInstanced = function (count) {
    count = count || 60;
    var scene = document.querySelector('a-scene');
    var geo = new THREE.IcosahedronGeometry(0.22, 0);
    var mat = new THREE.MeshStandardMaterial({color: 0x3fa9ff, metalness: 0.4, roughness: 0.5});
    var inst = new THREE.InstancedMesh(geo, mat, count);
    var m = new THREE.Matrix4();
    for (var i = 0; i < count; i++) {
      m.makeTranslation(((i % 10) - 4.5) * 0.8, 0.6 + Math.floor(i / 10) * 0.7, -17);
      inst.setMatrixAt(i, m);
    }
    var e = document.createElement('a-entity');
    e.id = 'x1280-instanced';
    scene.appendChild(e);
    e.setObject3D('mesh', inst);
    return count + ' instances in 1 draw call';
  };

  window.x1280ClearSpawned = function () {
    ['x1280-spawned', 'x1280-instanced'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.parentNode.removeChild(el); }
    });
  };

  // E3: x1280SetFilters('mine' | 'default' | {minFilter: ..., magFilter: ..., anisotropy: ...})
  window.x1280SetFilters = function (mode, selector) {
    var el = document.querySelector(selector || '#ground');
    var comp = el && el.components['x1280-texture'];
    if (!comp || !comp.texture) { return 'no texture yet'; }
    var tex = comp.texture;
    if (mode === 'mine') { comp.configure(tex); }
    else if (mode === 'default') {
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = 1;
      tex.generateMipmaps = true;
    } else if (typeof mode === 'object') {
      Object.keys(mode).forEach(function (k) {
        if (!(k in tex)) { console.warn('[E3] THREE.Texture has no property "' + k + '"'); }
        tex[k] = mode[k];
      });
    }
    tex.needsUpdate = true;
    return {minFilter: tex.minFilter, magFilter: tex.magFilter, anisotropy: tex.anisotropy, generateMipmaps: tex.generateMipmaps};
  };
})();