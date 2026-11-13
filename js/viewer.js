/*
 * Technical Precision: example-part viewer.
 *
 * Every part here is an ORIGINAL example modeled in code for this website.
 * None of them is a customer part or a copy of anyone's drawing.
 *
 * Parts are built from simple solids (extruded profiles and revolved
 * profiles) with drilled, counterbored, countersunk and tapped features.
 * Each builder emits three things: triangles for shading, exact "drawing"
 * edges, and silhouette candidates that are re-evaluated as the view turns,
 * so curved surfaces get proper outlines like a CAD hidden-line view.
 * Units are inches.
 */
(function () {
  'use strict';

  /* ==================================================================
     Catalog: what each example part is and which shop processes it uses.
     ================================================================== */
  var CATALOG = [
    {
      id: 'stanchion', dwg: 'TP-EX-101', group: 'Marine', name: 'Stanchion base',
      blurb: 'Round deck base that holds a rail or stanchion tube.',
      material: '316 stainless or 6061 aluminum',
      ops: ['CNC machining', 'Drilling', 'Countersinking'],
      notes: ['Ø1.000 socket bore, 1.500 deep', '3× countersunk mounting holes on a Ø2.250 bolt circle',
        'Ø.250 drain hole through the base', 'R.06 blend where the socket meets the flange']
    },
    {
      id: 'cleat', dwg: 'TP-EX-102', group: 'Marine', name: 'Billet dock cleat',
      blurb: 'Six-inch cleat cut from solid bar, bolted from below.',
      material: '6061 aluminum or stainless bar',
      ops: ['CNC machining', 'Drilling & tapping', 'Wide-belt sanding'],
      notes: ['6.0 in. horn to horn, profile milled from one piece', 'Open arch between the posts for the line',
        '2× 5/16-18 tapped holes in the base for through-bolting', 'Base sanded flat to sit tight on the deck']
    },
    {
      id: 'coupling', dwg: 'TP-EX-103', group: 'Marine', name: 'Prop shaft coupling',
      blurb: 'Flanged half-coupling for a 1 in. propeller shaft.',
      material: 'Steel or stainless bar',
      ops: ['CNC machining', 'Drilling'],
      notes: ['Ø1.000 shaft bore through hub and flange', '4× Ø.406 bolt holes on a Ø3.000 bolt circle',
        'Ø2.500 pilot register on the mating face', 'Chamfered hub end']
    },
    {
      id: 'transom', dwg: 'TP-EX-104', group: 'Marine', name: 'Transom accessory bracket',
      blurb: 'Formed plate bracket with welded gussets for gear on the transom.',
      material: '3/16 in. aluminum or steel plate',
      ops: ['Punching', 'Press brake bending', 'Welding', 'Powder coating'],
      notes: ['One 90° press-brake bend, inside radius = material thickness', '2× adjustment slots on the transom leg',
        '4× mounting holes and a Ø1.000 cable pass-through on the shelf', '2× gussets with fillet welds both sides']
    },
    {
      id: 'triclamp', dwg: 'TP-EX-201', group: 'Brewery', name: 'Tri-clamp port flange',
      blurb: 'Bolt-on tank port with a welded 1.5 in. sanitary clamp ferrule.',
      material: '304 or 316 stainless',
      ops: ['CNC machining', 'Drilling', 'Welding'],
      notes: ['Ø4.500 flange, 6× Ø.406 bolt holes', '1.5 in. clamp-style ferrule with gasket groove',
        'Fillet weld all around the ferrule', 'Through port matches the ferrule bore']
    },
    {
      id: 'breadboard', dwg: 'TP-EX-301', group: 'Scientific', name: 'Instrument mounting plate',
      blurb: 'Flat plate with a 1 in. grid of tapped holes for lab and optical setups.',
      material: '6061 aluminum plate',
      ops: ['CNC machining', 'Drilling & tapping', 'Wide-belt sanding'],
      notes: ['35× 1/4-20 tapped holes on a 1.000 grid', '4× counterbored corner holes for 1/4 cap screws',
        '4× 8-32 tapped holes in the end faces', 'Grained finish on the top face']
    },
    {
      id: 'manifold', dwg: 'TP-EX-401', group: 'Automotive & fluid power', name: 'Hydraulic manifold block',
      blurb: 'Billet block with cross-drilled passages and ports on four faces.',
      material: '6061 aluminum bar',
      ops: ['CNC machining', 'Drilling & tapping'],
      notes: ['Ports on the front, top and side faces, spot-faced', 'Cross-drilled internal passages',
        '2× counterbored through holes for mounting', '2× 1/4-20 tapped holes on the bottom']
    }
  ];

  /* ==================================================================
     2D helpers
     ================================================================== */
  var PI = Math.PI, TAU = PI * 2;

  function segsFor(r) { return r < 0.12 ? 16 : r < 0.3 ? 24 : r < 0.7 ? 32 : r < 1.6 ? 56 : 72; }

  function circle(cx, cy, r, n) {
    n = n || segsFor(r);
    var p = [];
    for (var i = 0; i < n; i++) { var a = i / n * TAU; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return p;
  }
  function rotPts(p, ang, cx, cy) {
    var c = Math.cos(ang), s = Math.sin(ang);
    return p.map(function (q) { return [cx + q[0] * c - q[1] * s, cy + q[0] * s + q[1] * c]; });
  }
  // Obround slot, CCW. len = overall length, w = width, ang in radians.
  function slot(cx, cy, len, w, ang) {
    var r = w / 2, h = (len - w) / 2, n = 10, p = [], i, a;
    for (i = 0; i <= n; i++) { a = -PI / 2 + PI * i / n; p.push([h + r * Math.cos(a), r * Math.sin(a)]); }
    for (i = 0; i <= n; i++) { a = PI / 2 + PI * i / n; p.push([-h + r * Math.cos(a), r * Math.sin(a)]); }
    return rotPts(p, ang || 0, cx, cy);
  }
  // Rounded rectangle, CCW.
  function rrect(cx, cy, w, h, r) {
    var p = [], hx = w / 2 - r, hy = h / 2 - r, n = r > 0 ? 6 : 0;
    var cs = [[hx, -hy, -PI / 2], [hx, hy, 0], [-hx, hy, PI / 2], [-hx, -hy, PI]];
    cs.forEach(function (c) {
      if (!n) { p.push([c[0] + (c[0] > 0 ? r : -r), c[1] + (c[1] > 0 ? r : -r)]); return; }
      for (var i = 0; i <= n; i++) { var a = c[2] + PI / 2 * i / n; p.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); }
    });
    return p.map(function (q) { return [q[0] + cx, q[1] + cy]; });
  }
  function area(p) {
    var s = 0;
    for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
    return s / 2;
  }
  function pointInPoly(p, x, y) {
    var c = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      var xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  // Index of the outline edge whose midpoint is closest to (x, y).
  function edgeNear(p, x, y) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < p.length; i++) {
      var a = p[i], b = p[(i + 1) % p.length];
      var d = Math.hypot((a[0] + b[0]) / 2 - x, (a[1] + b[1]) / 2 - y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  // Path recorder for profiles: points plus a tag for each edge.
  function Path2(x, y) { this.p = [[x, y]]; this.tags = []; }
  Path2.prototype.line = function (x, y, tag) { this.p.push([x, y]); this.tags.push(tag || null); return this; };
  Path2.prototype.bez = function (c1x, c1y, c2x, c2y, x, y, n) {
    var s = this.p[this.p.length - 1];
    for (var i = 1; i <= n; i++) {
      var t = i / n, u = 1 - t;
      this.p.push([u * u * u * s[0] + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x,
        u * u * u * s[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y]);
      this.tags.push(null);
    }
    return this;
  };
  Path2.prototype.arc = function (cx, cy, rx, ry, a0, a1, n) {
    for (var i = 1; i <= n; i++) {
      var a = a0 + (a1 - a0) * i / n;
      this.p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); this.tags.push(null);
    }
    return this;
  };
  Path2.prototype.close = function (tag) {
    var p = this.p, t = this.tags.slice();
    var f = p[0], l = p[p.length - 1];
    if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-9) { p = p.slice(0, -1); } else { t.push(tag || null); }
    return { outline: p, tags: t };
  };

  /* ==================================================================
     Geometry builder
     ================================================================== */
  function makeBuilderClass(T) {
    var V3 = T.Vector3;
    var _ab = new V3(), _ac = new V3();

    function Builder() {
      this.P = []; this.N = []; this.E = []; this.C = []; this.S = [];
      this.m = new T.Matrix4(); this.nm = new T.Matrix3(); this.features = 0;
    }
    Builder.prototype.use = function (m) {
      this.m.copy(m || new T.Matrix4()); this.nm.getNormalMatrix(this.m); return this;
    };
    Builder.prototype.tp = function (v) { return v.clone().applyMatrix4(this.m); };
    Builder.prototype.tn = function (v) { return v.clone().applyMatrix3(this.nm).normalize(); };
    Builder.prototype.tri = function (a, b, c, na, nb, nc) {
      var A = this.tp(a), B = this.tp(b), C = this.tp(c);
      var NA = this.tn(na), NB = this.tn(nb || na), NC = this.tn(nc || na);
      _ab.subVectors(B, A); _ac.subVectors(C, A);
      var cr = _ab.clone().cross(_ac);
      if (cr.lengthSq() < 1e-16) return;
      var avg = NA.clone().add(NB).add(NC);
      if (cr.dot(avg) < 0) { var t = B; B = C; C = t; t = NB; NB = NC; NC = t; }
      this.P.push(A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z);
      this.N.push(NA.x, NA.y, NA.z, NB.x, NB.y, NB.z, NC.x, NC.y, NC.z);
    };
    Builder.prototype.quad = function (a, b, c, d, na, nb, nc, nd) {
      this.tri(a, b, c, na, nb, nc); this.tri(a, c, d, na, nc, nd);
    };
    Builder.prototype.edge = function (a, b, cosmetic) {
      var A = this.tp(a), B = this.tp(b);
      (cosmetic ? this.C : this.E).push(A.x, A.y, A.z, B.x, B.y, B.z);
    };
    Builder.prototype.loop = function (pts, closed, cosmetic) {
      var n = pts.length, last = closed ? n : n - 1;
      for (var i = 0; i < last; i++) this.edge(pts[i], pts[(i + 1) % n], cosmetic);
    };
    Builder.prototype.sil = function (a, b, n1, n2) {
      var A = this.tp(a), B = this.tp(b), N1 = this.tn(n1), N2 = this.tn(n2);
      this.S.push(A.x, A.y, A.z, B.x, B.y, B.z, N1.x, N1.y, N1.z, N2.x, N2.y, N2.z);
    };
    return Builder;
  }

  /* ==================================================================
     Solids: faces, walls, features, prisms, revolves, sheet profiles
     ================================================================== */
  function makeSolids(T) {
    var V3 = T.Vector3;

    function frame(O, U, V, N) {
      return {
        O: O, U: U, V: V, N: N,
        at: function (u, v, d) {
          return new V3().copy(O).addScaledVector(U, u).addScaledVector(V, v).addScaledVector(N, -(d || 0));
        },
        dir2: function (nu, nv) { return new V3().addScaledVector(U, nu).addScaledVector(V, nv); }
      };
    }

    // Flat face with holes, in face coordinates, offset d below the surface.
    function planar(B, f, contour, holes, d) {
      d = d || 0;
      var c = contour.map(function (p) { return new T.Vector2(p[0], p[1]); });
      var hs = holes.map(function (h) { return h.map(function (p) { return new T.Vector2(p[0], p[1]); }); });
      var all = c.concat.apply(c, hs);
      var tris = T.ShapeUtils.triangulateShape(c, hs);
      for (var i = 0; i < tris.length; i++) {
        var t = tris[i];
        B.tri(f.at(all[t[0]].x, all[t[0]].y, d), f.at(all[t[1]].x, all[t[1]].y, d), f.at(all[t[2]].x, all[t[2]].y, d), f.N);
      }
    }

    // Side wall between loop0 (depth d0) and loop1 (depth d1), same point count.
    // side = +1: normals toward the loop's inside (hole walls, CCW loops).
    // side = -1: normals to the right of travel (outer walls of CCW outlines, prism holes that are CW).
    // flags[i]: 'c' crease (edge), 't' tangent (smooth shading, edge drawn), 's' smooth (silhouette only).
    function wall(B, f, loop0, loop1, d0, d1, side, flags, skip) {
      var n = loop0.length, i, j;
      var cone = loop0 !== loop1;
      var en = [];
      for (i = 0; i < n; i++) {
        var a = loop0[i], b = loop0[(i + 1) % n];
        var du = b[0] - a[0], dv = b[1] - a[1], L = Math.hypot(du, dv) || 1;
        du /= L; dv /= L;
        en.push(side > 0 ? [-dv, du] : [dv, -du]);
      }
      var kind = [];
      for (i = 0; i < n; i++) {
        var e0 = en[(i - 1 + n) % n], e1 = en[i];
        var k = (e0[0] * e1[0] + e0[1] * e1[1]) > Math.cos(28 * PI / 180) ? 's' : 'c';
        if (flags && flags[i]) k = flags[i];
        kind.push(k);
      }
      var P0 = loop0.map(function (p) { return f.at(p[0], p[1], d0); });
      var P1 = loop1.map(function (p) { return f.at(p[0], p[1], d1); });
      var qn = [];
      for (i = 0; i < n; i++) {
        j = (i + 1) % n;
        var pn = f.dir2(en[i][0], en[i][1]).normalize(), nn;
        if (!cone) nn = pn;
        else {
          nn = new V3().subVectors(P0[j], P0[i]).cross(new V3().subVectors(P1[i], P0[i]));
          if (nn.lengthSq() < 1e-16) nn = new V3().subVectors(P1[j], P0[i]).cross(new V3().subVectors(P0[j], P0[i]));
          nn.normalize();
          if (nn.dot(pn) < 0) nn.negate();
        }
        qn.push(nn);
      }
      var vn = [];
      for (i = 0; i < n; i++) vn.push(kind[i] === 'c' ? null : new V3().addVectors(qn[(i - 1 + n) % n], qn[i]).normalize());
      for (i = 0; i < n; i++) {
        if (skip && skip[i]) continue;
        j = (i + 1) % n;
        var ni = vn[i] || qn[i], nj = vn[j] || qn[i];
        B.quad(P0[i], P0[j], P1[j], P1[i], ni, nj, nj, ni);
      }
      for (i = 0; i < n; i++) {
        if (kind[i] === 's') B.sil(P0[i], P1[i], qn[(i - 1 + n) % n], qn[i]);
        else B.edge(P0[i], P1[i]);
      }
      return { P0: P0, P1: P1 };
    }

    function featureLoop(ft) {
      var at = ft.at;
      if (ft.type === 'slot') return slot(at[0], at[1], ft.len, ft.w, ft.ang || 0);
      if (ft.type === 'rect') return rrect(at[0], at[1], ft.w, ft.h, ft.r || 0);
      return circle(at[0], at[1], ft.d / 2, ft.n);
    }

    // Find the face a through-feature exits from.
    function findExit(f, at, faces) {
      var P = f.at(at[0], at[1], 0), best = null, bs = 1e9;
      faces.forEach(function (g) {
        if (g.frame === f) return;
        var den = f.N.dot(g.frame.N);
        if (den > -0.999) return;
        var s = new V3().subVectors(P, g.frame.O).dot(g.frame.N) / den;
        if (!(s > 1e-6) || s >= bs) return;
        var Q = new V3().copy(P).addScaledVector(f.N, -s).sub(g.frame.O);
        if (!g.inside(Q.dot(g.frame.U), Q.dot(g.frame.V))) return;
        best = g; bs = s;
      });
      return best ? { face: best, s: bs } : null;
    }

    // Drill/punch/mill one feature into face f. Returns the outline at the surface.
    function feature(B, face, ft, faces) {
      var f = face.frame;
      var loopB = featureLoop(ft);
      var depth = ft.depth, open = !!ft.open, exit = null;
      if (depth === 'thru') {
        exit = findExit(f, ft.at, faces);
        depth = exit ? exit.s : 0.25;
        open = true;
      }
      var surface = loopB, start = 0;
      if (ft.cb) {
        var loopC = circle(ft.at[0], ft.at[1], ft.cb.d / 2);
        wall(B, f, loopC, loopC, 0, ft.cb.depth, 1);
        planar(B, f, loopC, [loopB], ft.cb.depth);
        B.loop(loopC.map(function (p) { return f.at(p[0], p[1], 0); }), true);
        B.loop(loopC.map(function (p) { return f.at(p[0], p[1], ft.cb.depth); }), true);
        B.loop(loopB.map(function (p) { return f.at(p[0], p[1], ft.cb.depth); }), true);
        surface = loopC; start = ft.cb.depth;
      } else if (ft.cs) {
        var r = ft.d / 2, R = ft.cs.d / 2;
        var csd = (R - r) / Math.tan((ft.cs.angle || 82) / 2 * PI / 180);
        var loopS = circle(ft.at[0], ft.at[1], R, loopB.length);
        wall(B, f, loopS, loopB, 0, csd, 1);
        B.loop(loopS.map(function (p) { return f.at(p[0], p[1], 0); }), true);
        B.loop(loopB.map(function (p) { return f.at(p[0], p[1], csd); }), true);
        surface = loopS; start = csd;
      } else {
        B.loop(loopB.map(function (p) { return f.at(p[0], p[1], 0); }), true);
      }
      wall(B, f, loopB, loopB, start, depth, 1);
      if (!open) {
        B.loop(loopB.map(function (p) { return f.at(p[0], p[1], depth); }), true);
        if (ft.point && (!ft.type || ft.type === 'hole')) {
          var apex = f.at(ft.at[0], ft.at[1], depth + ft.d / 2 * 0.6);
          var ring = loopB.map(function (p) { return f.at(p[0], p[1], depth); });
          for (var i = 0; i < ring.length; i++) {
            var a = ring[i], b = ring[(i + 1) % ring.length];
            var nn = new V3().subVectors(b, a).cross(new V3().subVectors(apex, a)).normalize();
            if (nn.dot(f.N) < 0) nn.negate();
            B.tri(a, b, apex, nn);
          }
        } else {
          planar(B, f, loopB, [], depth);
        }
      }
      if (exit) {
        var g = exit.face;
        var pts3 = loopB.map(function (p) { return f.at(p[0], p[1], depth); });
        g.holes.push(pts3.map(function (Q) {
          var q = Q.clone().sub(g.frame.O);
          return [q.dot(g.frame.U), q.dot(g.frame.V)];
        }));
        g.used = true;
        B.loop(pts3, true);
      }
      if (ft.tap) {
        // Cosmetic thread: three-quarter circle at the major diameter (drafting convention).
        var arc = [], rr = ft.tap / 2, n = 24;
        for (var k = 0; k <= n; k++) {
          var ang = 0.25 * PI + 1.5 * PI * k / n;
          arc.push(f.at(ft.at[0] + rr * Math.cos(ang), ft.at[1] + rr * Math.sin(ang), 0));
        }
        B.loop(arc, false, true);
      }
      B.features++;
      return surface;
    }

    /*
     * Prism: outline (XY) extruded along +Z from 0 to D.
     * spec: { outline, flags?, tags?, holes?, holeNoEdge?, D, feats? }
     * feats: [{ face: 'front' | 'back' | tag | edgeIndex, at:[u,v], d, depth, cb, cs, point, tap, type, ... }]
     */
    function prism(B, spec) {
      var out = spec.outline.slice(), flags = spec.flags ? spec.flags.slice() : null;
      var tags = spec.tags ? spec.tags.slice() : null, D = spec.D, n, i;
      if (area(out) < 0) {
        n = out.length;
        out.reverse();
        if (flags) flags.reverse();
        if (tags) { var nt = []; for (i = 0; i < n; i++) nt.push(tags[(n - 2 - i + n) % n]); tags = nt; }
      }
      n = out.length;
      var holes = (spec.holes || []).map(function (h) { h = h.slice(); if (area(h) > 0) h.reverse(); return h; });
      var noEdge = spec.holeNoEdge || [];

      var front = { key: 'front', frame: frame(new V3(0, 0, D), new V3(1, 0, 0), new V3(0, 1, 0), new V3(0, 0, 1)), holes: [] };
      front.inside = function (u, v) { return pointInPoly(out, u, v); };
      var back = { key: 'back', frame: frame(new V3(0, 0, 0), new V3(1, 0, 0), new V3(0, -1, 0), new V3(0, 0, -1)), holes: [] };
      back.inside = function (u, v) { return pointInPoly(out, u, -v); };
      var faces = [front, back], sides = [];
      for (i = 0; i < n; i++) {
        var a = out[i], b = out[(i + 1) % n];
        var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
        dx /= L; dy /= L;
        var sf = {
          key: tags && tags[i] ? tags[i] : i, index: i, L: L,
          frame: frame(new V3(a[0], a[1], 0), new V3(dx, dy, 0), new V3(0, 0, 1), new V3(dy, -dx, 0)), holes: []
        };
        sf.inside = (function (L2) { return function (u, v) { return u > -1e-6 && u < L2 + 1e-6 && v > -1e-6 && v < D + 1e-6; }; })(L);
        sides.push(sf); faces.push(sf);
      }
      function faceBy(key) {
        for (var k = 0; k < faces.length; k++) if (faces[k].key === key) return faces[k];
        throw new Error('No face ' + key);
      }
      (spec.feats || []).forEach(function (ft) {
        var face = faceBy(ft.face);
        face.holes.push(feature(B, face, ft, faces));
        face.used = true;
      });

      // Caps
      planar(B, front.frame, out, holes.concat(front.holes));
      var backOut = out.map(function (p) { return [p[0], -p[1]]; });
      var backHoles = holes.map(function (h) { return h.map(function (p) { return [p[0], -p[1]]; }); });
      planar(B, back.frame, backOut, backHoles.concat(back.holes));

      // Outer wall (featured flat sides are built as faces with holes instead)
      var F0 = frame(new V3(0, 0, 0), new V3(1, 0, 0), new V3(0, 1, 0), new V3(0, 0, -1));
      var skip = sides.map(function (s) { return !!s.used; });
      wall(B, F0, out, out, 0, D, -1, flags, skip);
      sides.forEach(function (s) {
        if (!s.used) return;
        planar(B, s.frame, [[0, 0], [s.L, 0], [s.L, D], [0, D]], s.holes);
      });
      // Through holes along Z
      holes.forEach(function (h) { wall(B, F0, h, h, 0, D, -1, null); });

      // Cap edges
      var z0 = out.map(function (p) { return new V3(p[0], p[1], 0); });
      var z1 = out.map(function (p) { return new V3(p[0], p[1], D); });
      B.loop(z0, true); B.loop(z1, true);
      holes.forEach(function (h, k) {
        var ne = noEdge[k] || {};
        if (!ne.back) B.loop(h.map(function (p) { return new V3(p[0], p[1], 0); }), true);
        if (!ne.front) B.loop(h.map(function (p) { return new V3(p[0], p[1], D); }), true);
      });
      B.features += holes.length;
    }

    /*
     * Revolve a profile [[r, y, flag], ...] about +Y. Material must be on the
     * LEFT of the direction of travel (counter-clockwise around the material
     * in the r-y plane), so normals point out of the material.
     * flag: 'c' crease, 't' tangent (edge drawn), 's' smooth, 'n' no edge.
     */
    function revolve(B, spec) {
      var pr = spec.profile, m = pr.length, closed = !!spec.closed, n = spec.n || 72;
      var segCount = closed ? m : m - 1, j, k;
      var sn = [];
      for (j = 0; j < segCount; j++) {
        var a = pr[j], b = pr[(j + 1) % m];
        var dr = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dr, dy) || 1;
        sn.push([dy / L, -dr / L]);
      }
      var kind = [];
      for (j = 0; j < m; j++) {
        var hasPrev = closed || j > 0, hasNext = closed || j < m - 1;
        var kk = 'c';
        if (hasPrev && hasNext) {
          var s0 = sn[(j - 1 + segCount) % segCount], s1 = sn[j % segCount];
          kk = (s0[0] * s1[0] + s0[1] * s1[1]) > Math.cos(28 * PI / 180) ? 's' : 'c';
        }
        if (pr[j][2]) kk = pr[j][2];
        kind.push(kk);
      }
      var cs = [], sns = [];
      for (k = 0; k <= n; k++) { cs.push(Math.cos(k / n * TAU)); sns.push(Math.sin(k / n * TAU)); }
      function P(r, y, kk2) { return new V3(r * cs[kk2], y, -r * sns[kk2]); }
      function Nr(nr, ny, ang) { return new V3(nr * Math.cos(ang), ny, -nr * Math.sin(ang)); }
      function vnorm(jj, seg) {
        // normal at profile vertex jj for segment seg (smooth vertices average neighbours)
        if (kind[jj] === 'c' || kind[jj] === 'n') return sn[seg];
        var hasPrev = closed || jj > 0, hasNext = closed || jj < m - 1;
        if (!hasPrev || !hasNext) return sn[seg];
        var s0 = sn[(jj - 1 + segCount) % segCount], s1 = sn[jj % segCount];
        var x = s0[0] + s1[0], y = s0[1] + s1[1], L2 = Math.hypot(x, y) || 1;
        return [x / L2, y / L2];
      }
      for (j = 0; j < segCount; j++) {
        var j2 = (j + 1) % m, A = pr[j], Bp = pr[j2];
        var na = vnorm(j, j), nb = vnorm(j2, j);
        for (k = 0; k < n; k++) {
          var a0 = k / n * TAU, a1 = (k + 1) / n * TAU;
          B.quad(P(A[0], A[1], k), P(Bp[0], Bp[1], k), P(Bp[0], Bp[1], k + 1), P(A[0], A[1], k + 1),
            Nr(na[0], na[1], a0), Nr(nb[0], nb[1], a0), Nr(nb[0], nb[1], a1), Nr(na[0], na[1], a1));
          // meridian silhouette candidates
          if (A[0] > 1e-6 || Bp[0] > 1e-6) {
            var am = (k - 0.5) / n * TAU, ap = (k + 0.5) / n * TAU;
            B.sil(P(A[0], A[1], k), P(Bp[0], Bp[1], k), Nr(sn[j][0], sn[j][1], am), Nr(sn[j][0], sn[j][1], ap));
          }
        }
      }
      for (j = 0; j < m; j++) {
        var r = pr[j][0], y = pr[j][1];
        if (r < 1e-6) continue;
        var ring = [];
        for (k = 0; k < n; k++) ring.push(P(r, y, k));
        if (kind[j] === 'c' || kind[j] === 't') B.loop(ring, true);
        else if (kind[j] === 's') {
          var sPrev = sn[(j - 1 + segCount) % segCount], sNext = sn[j % segCount];
          for (k = 0; k < n; k++) {
            var amid = (k + 0.5) / n * TAU;
            B.sil(ring[k], ring[(k + 1) % n], Nr(sPrev[0], sPrev[1], amid), Nr(sNext[0], sNext[1], amid));
          }
        }
      }
    }

    /*
     * Sheet-metal cross-section: turtle path for the mid-plane, offset by
     * half the thickness on each side, bends with inside radius ri.
     * Returns { outline, flags, tags } for prism(); flat faces are tagged
     * 'R0','L0','R1','L1',... (right/left side of each straight run).
     */
    function sheet2D(o) {
      var t = o.t, rm = o.ri + t / 2, x = o.x, y = o.y, h = o.heading * PI / 180;
      var C = [{ x: x, y: y, h: h, f: 'c' }], edgeRun = [], run = 0;
      o.steps.forEach(function (s) {
        if (s.L != null) {
          x += Math.cos(h) * s.L; y += Math.sin(h) * s.L;
          C.push({ x: x, y: y, h: h, f: 't' }); edgeRun.push(run);
        } else {
          var b = s.bend * PI / 180, sg = b > 0 ? 1 : -1, nseg = Math.max(6, Math.ceil(Math.abs(b) / (PI / 24)));
          var cx = x + sg * rm * -Math.sin(h), cy = y + sg * rm * Math.cos(h);
          for (var i = 1; i <= nseg; i++) {
            var hi = h + b * i / nseg;
            var px = cx - sg * rm * -Math.sin(hi), py = cy - sg * rm * Math.cos(hi);
            C.push({ x: px, y: py, h: hi, f: i === nseg ? 't' : 's' }); edgeRun.push(-1);
          }
          h += b; x = C[C.length - 1].x; y = C[C.length - 1].y; run++;
        }
      });
      C[C.length - 1].f = 'c';
      var R = [], Lft = [];
      C.forEach(function (c) {
        var nx = -Math.sin(c.h), ny = Math.cos(c.h);
        R.push([c.x - nx * t / 2, c.y - ny * t / 2]);
        Lft.push([c.x + nx * t / 2, c.y + ny * t / 2]);
      });
      var m = C.length, outline = [], flags = [], tags = [], i;
      for (i = 0; i < m; i++) { outline.push(R[i]); flags.push(C[i].f); }
      for (i = m - 1; i >= 0; i--) { outline.push(Lft[i]); flags.push(C[i].f); }
      for (i = 0; i < m - 1; i++) tags.push(edgeRun[i] >= 0 ? 'R' + edgeRun[i] : null);
      tags.push('E1');
      for (i = m - 1; i > 0; i--) tags.push(edgeRun[i - 1] >= 0 ? 'L' + edgeRun[i - 1] : null);
      tags.push('E0');
      return { outline: outline, flags: flags, tags: tags };
    }

    return { prism: prism, revolve: revolve, sheet2D: sheet2D };
  }

  /* ==================================================================
     Part models
     ================================================================== */
  function makeModels(T, S) {
    var M4 = T.Matrix4;
    function rotX(a) { return new M4().makeRotationX(a); }
    function rotZ(a) { return new M4().makeRotationZ(a); }
    function tr(x, y, z) { return new M4().makeTranslation(x, y, z); }
    function mul() { var m = new M4(); for (var i = 0; i < arguments.length; i++) m.multiply(arguments[i]); return m; }
    function basis(o, ax, ay, az) {
      return new M4().makeBasis(new T.Vector3().fromArray(ax), new T.Vector3().fromArray(ay), new T.Vector3().fromArray(az)).setPosition(o[0], o[1], o[2]);
    }
    var FLAT = rotX(-PI / 2); // prism extrusion axis (local Z) -> world +Y

    function bolts(n, bcr, d, start) {
      var h = [];
      for (var i = 0; i < n; i++) { var a = (start || 0) + i / n * TAU; h.push(circle(bcr * Math.cos(a), bcr * Math.sin(a), d / 2)); }
      return h;
    }
    // Fillet weld bead running along local +Z of matrix m (leg size w).
    function bead(B, m, w, len) {
      var p = new Path2(0, 0).line(w, 0);
      var s = [w, 0], c = [w * 0.82, w * 0.82], e = [0, w];
      for (var i = 1; i <= 6; i++) {
        var t = i / 6, u = 1 - t;
        p.p.push([u * u * s[0] + 2 * u * t * c[0] + t * t * e[0], u * u * s[1] + 2 * u * t * c[1] + t * t * e[1]]);
        p.tags.push(null);
      }
      var o = p.close();
      B.use(m); S.prism(B, { outline: o.outline, D: len });
    }

    return {
      stanchion: function (B) {
        B.use(FLAT);
        S.prism(B, {
          outline: circle(0, 0, 1.5, 120), D: 0.25,
          holes: [circle(0, 0, 0.125)],
          feats: [0, 1, 2].map(function (i) {
            var a = i / 3 * TAU;
            return { face: 'front', at: [1.125 * Math.cos(a), 1.125 * Math.sin(a)], d: 0.201, depth: 'thru', cs: { d: 0.42 } };
          })
        });
        B.use(null);
        var prof = [[0.76, 0.25, 't']];
        for (var i = 1; i < 6; i++) { var a = 1.5 * PI - (PI / 2) * i / 6; prof.push([0.76 + 0.06 * Math.cos(a), 0.31 + 0.06 * Math.sin(a), 's']); }
        prof.push([0.70, 0.31, 't'], [0.70, 1.69, 'c'], [0.64, 1.75, 'c'], [0.56, 1.75, 'c'], [0.50, 1.69, 'c'], [0.50, 0.25, 'c']);
        S.revolve(B, { profile: prof, n: 96 });
      },

      cleat: function (B) {
        var right = new Path2(1.70, 0)
          .bez(1.80, 0.45, 2.05, 0.82, 2.55, 0.98, 14)
          .bez(2.75, 1.03, 2.90, 1.07, 2.98, 1.11, 6)
          .arc(2.98, 1.27, 0.16, 0.16, -PI / 2, PI / 2, 14)
          .bez(2.50, 1.52, 1.40, 1.46, 0.0, 1.40, 22);
        var R = right.p;
        var path = new Path2(-1.70, 0).line(-0.75, 0, 'PL').arc(0, 0, 0.75, 0.80, PI, 0, 28).line(1.70, 0, 'PR');
        for (var i = 1; i < R.length; i++) path.line(R[i][0], R[i][1]);
        for (i = R.length - 2; i >= 1; i--) path.line(-R[i][0], R[i][1]);
        var o = path.close();
        B.use(tr(0, 0, -0.5));
        S.prism(B, {
          outline: o.outline, tags: o.tags, D: 1.0,
          feats: [
            { face: 'PL', at: [0.475, 0.5], d: 0.257, depth: 0.75, point: true, tap: 0.3125 },
            { face: 'PR', at: [0.475, 0.5], d: 0.257, depth: 0.75, point: true, tap: 0.3125 }
          ]
        });
      },

      coupling: function (B) {
        var G = rotZ(PI / 2);
        B.use(mul(G, FLAT));
        S.prism(B, {
          outline: circle(0, 0, 2.0, 120), D: 0.625,
          holes: [circle(0, 0, 0.5)].concat(bolts(4, 1.5, 0.406, PI / 4)),
          holeNoEdge: [{ front: true, back: true }]
        });
        B.use(G);
        S.revolve(B, { profile: [[1.25, 0.625, 'c'], [1.25, 0.685, 'c'], [0.5, 0.685, 'c'], [0.5, 0.625, 'n']], n: 96 });
        S.revolve(B, {
          profile: [[0.5, 0, 'n'], [0.5, -1.19, 'c'], [0.56, -1.25, 'c'], [0.815, -1.25, 'c'], [0.875, -1.19, 'c'], [0.875, 0, 'c']],
          n: 96
        });
      },

      transom: function (B) {
        var t = 0.1875, D = 4.0;
        var sh = S.sheet2D({ x: t / 2, y: 3.0, heading: -90, t: t, ri: t, steps: [{ L: 2.5 }, { bend: 90 }, { L: 2.2 }] });
        S.prism(B, {
          outline: sh.outline, flags: sh.flags, tags: sh.tags, D: D,
          feats: [
            { face: 'R0', type: 'slot', at: [0.9, 1.0], len: 0.75, w: 0.3125, depth: 'thru' },
            { face: 'R0', type: 'slot', at: [0.9, 3.0], len: 0.75, w: 0.3125, depth: 'thru' },
            { face: 'R0', at: [1.9, 2.0], d: 0.375, depth: 'thru' },
            { face: 'L1', at: [0.45, 1.2], d: 0.281, depth: 'thru' },
            { face: 'L1', at: [0.45, 2.8], d: 0.281, depth: 'thru' },
            { face: 'L1', at: [1.65, 1.2], d: 0.281, depth: 'thru' },
            { face: 'L1', at: [1.65, 2.8], d: 0.281, depth: 'thru' },
            { face: 'L1', at: [1.05, 2.0], d: 1.0, depth: 'thru' }
          ]
        });
        var xi = t, yi = 0.3125, c = 0.45, G = 1.6, w = 0.15;
        [0.55, D - 0.55 - t].forEach(function (z0) {
          B.use(tr(0, 0, z0));
          S.prism(B, { outline: [[xi + c, yi], [xi + G, yi], [xi, yi + G], [xi, yi + c]], D: t });
          // fillet welds, both sides of each gusset, on both legs
          bead(B, basis([xi + c, yi, z0], [0, 0, -1], [0, 1, 0], [1, 0, 0]), w, G - c - 0.25);
          bead(B, basis([xi + c, yi, z0 + t], [0, 0, 1], [0, 1, 0], [1, 0, 0]), w, G - c - 0.25);
          bead(B, basis([xi, yi + c, z0], [0, 0, -1], [1, 0, 0], [0, 1, 0]), w, G - c - 0.25);
          bead(B, basis([xi, yi + c, z0 + t], [0, 0, 1], [1, 0, 0], [0, 1, 0]), w, G - c - 0.25);
        });
        B.use(null);
      },

      triclamp: function (B) {
        B.use(FLAT);
        S.prism(B, {
          outline: circle(0, 0, 2.25, 120), D: 0.375,
          holes: [circle(0, 0, 0.685, 96)].concat(bolts(6, 1.875, 0.406, PI / 6))
        });
        B.use(null);
        var prof = [[0.75, 0.375, 'c'], [0.75, 1.20, 'c'], [0.992, 1.32, 'c'], [0.992, 1.44, 'c'], [0.90, 1.44, 'c']];
        for (var i = 1; i < 8; i++) { var a = -PI * i / 8; prof.push([0.86 + 0.04 * Math.cos(a), 1.44 + 0.04 * Math.sin(a), 's']); }
        prof.push([0.82, 1.44, 'c'], [0.705, 1.44, 'c'], [0.685, 1.42, 'c'], [0.685, 0.375, 'c']);
        S.revolve(B, { profile: prof, n: 96 });
        var w = 0.09, bp = [[0.75 + w, 0.375, 't']];
        for (i = 1; i < 6; i++) {
          var t = i / 6, u = 1 - t;
          bp.push([u * u * (0.75 + w) + 2 * u * t * (0.75 + 0.82 * w) + t * t * 0.75,
            u * u * 0.375 + 2 * u * t * (0.375 + 0.82 * w) + t * t * (0.375 + w), 's']);
        }
        bp.push([0.75, 0.375 + w, 't']);
        S.revolve(B, { profile: bp, n: 96 });
      },

      breadboard: function (B) {
        var out = rrect(0, 0, 8, 6, 0.125);
        var tags = out.map(function () { return null; });
        var eR = edgeNear(out, 4, 0), eL = edgeNear(out, -4, 0);
        tags[eR] = 'endR'; tags[eL] = 'endL';
        var feats = [];
        for (var x = -3; x <= 3; x++) for (var y = -2; y <= 2; y++) feats.push({ face: 'front', at: [x, y], d: 0.201, depth: 'thru', tap: 0.25 });
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s) {
          feats.push({ face: 'front', at: [3.625 * s[0], 2.625 * s[1]], d: 0.281, depth: 'thru', cb: { d: 0.44, depth: 0.25 } });
        });
        var Le = 6 - 0.25;
        ['endR', 'endL'].forEach(function (k) {
          feats.push({ face: k, at: [Le / 3, 0.25], d: 0.136, depth: 0.375, point: true, tap: 0.164 });
          feats.push({ face: k, at: [Le * 2 / 3, 0.25], d: 0.136, depth: 0.375, point: true, tap: 0.164 });
        });
        B.use(FLAT);
        S.prism(B, { outline: out, tags: tags, D: 0.5, feats: feats });
      },

      manifold: function (B) {
        B.use(tr(-2, -1.25, -1));
        S.prism(B, {
          outline: [[0, 0], [4, 0], [4, 2.5], [0, 2.5]], tags: ['bottom', 'right', 'top', 'left'], D: 2.0,
          feats: [
            { face: 'front', at: [1.0, 1.4], d: 0.5625, depth: 1.2, point: true, cb: { d: 0.875, depth: 0.06 } },
            { face: 'front', at: [2.5, 1.4], d: 0.5625, depth: 1.2, point: true, cb: { d: 0.875, depth: 0.06 } },
            { face: 'front', at: [3.25, 0.7], d: 0.25, depth: 1.0, point: true, cb: { d: 0.5, depth: 0.04 } },
            { face: 'top', at: [3.0, 0.8], d: 0.5, depth: 1.1, open: true, cb: { d: 0.75, depth: 0.06 } },
            { face: 'top', at: [1.5, 0.8], d: 0.5, depth: 1.1, open: true, cb: { d: 0.75, depth: 0.06 } },
            { face: 'top', at: [3.65, 1.5], d: 0.281, depth: 'thru', cb: { d: 0.44, depth: 0.28 } },
            { face: 'top', at: [0.35, 1.5], d: 0.281, depth: 'thru', cb: { d: 0.44, depth: 0.28 } },
            { face: 'right', at: [1.4, 1.0], d: 0.5, depth: 1.5, open: true, cb: { d: 0.75, depth: 0.06 } },
            { face: 'bottom', at: [1.75, 0.5], d: 0.201, depth: 0.5, point: true, tap: 0.25 },
            { face: 'bottom', at: [3.0, 1.5], d: 0.201, depth: 0.5, point: true, tap: 0.25 }
          ]
        });
      }
    };
  }

  /* ==================================================================
     Viewer
     ================================================================== */
  function fmtIn(v) { return v.toFixed(3).replace(/^0\./, '.'); }

  function Viewer(root) {
    this.root = root;
    this.list = root.querySelector('[data-vw="list"]');
    this.info = root.querySelector('[data-vw="info"]');
    this.port = root.querySelector('[data-vw="port"]');
    this.status = root.querySelector('[data-vw="status"]');
    this.label = root.querySelector('[data-vw="label"]');
    this.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.current = null;
    this.renderList();
    this.select(CATALOG[0].id, true);
  }

  Viewer.prototype.renderList = function () {
    var self = this, html = '', lastGroup = null;
    CATALOG.forEach(function (p, i) {
      var g = p.group === 'Marine' ? 'Marine' : 'Other industries';
      if (g !== lastGroup) { html += '<li class="vw-group" role="presentation">' + g + '</li>'; lastGroup = g; }
      html += '<li><button type="button" class="vw-item" data-part="' + p.id + '" aria-pressed="false">' +
        '<span class="vw-num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="vw-name">' + p.name + '</span>' +
        '<span class="vw-dwg">' + p.dwg + '</span></button></li>';
    });
    this.list.innerHTML = html;
    this.list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-part]');
      if (b) self.select(b.getAttribute('data-part'));
    });
  };

  Viewer.prototype.renderInfo = function (p, stats) {
    var size = stats ? fmtIn(stats.x) + ' × ' + fmtIn(stats.z) + ' × ' + fmtIn(stats.y) + ' in' : '';
    var mm = stats ? '[' + (stats.x * 25.4).toFixed(1) + ' × ' + (stats.z * 25.4).toFixed(1) + ' × ' + (stats.y * 25.4).toFixed(1) + ' mm]' : '';
    this.info.innerHTML =
      '<p class="vw-info-tag">' + p.group + ' · ' + p.dwg + '</p>' +
      '<h3 class="vw-info-name">' + p.name + '</h3>' +
      '<p class="vw-info-blurb">' + p.blurb + '</p>' +
      '<dl class="vw-info-grid">' +
      (stats ? '<div><dt>Overall size</dt><dd>' + size + ' <span class="mm">' + mm + '</span></dd></div>' : '') +
      '<div><dt>Typical material</dt><dd>' + p.material + '</dd></div>' +
      (stats ? '<div><dt>Holes &amp; cutouts</dt><dd>' + stats.features + '</dd></div>' : '') +
      '</dl>' +
      '<p class="vw-info-sub">Shop processes</p><ul class="vw-ops">' + p.ops.map(function (o) { return '<li>' + o + '</li>'; }).join('') + '</ul>' +
      '<p class="vw-info-sub">Features</p><ul class="vw-notes">' + p.notes.map(function (o) { return '<li>' + o + '</li>'; }).join('') + '</ul>' +
      '<p class="vw-info-disclaimer">Example part designed for this website. Not a customer part.</p>' +
      '<a class="btn btn-ghost btn-sm" href="#quote" data-quote-similar="' + p.dwg + ' ' + p.name + '">Quote a part like this</a>';
  };

  Viewer.prototype.select = function (id, initial) {
    var p = CATALOG.filter(function (c) { return c.id === id; })[0];
    if (!p) return;
    this.current = p;
    Array.prototype.forEach.call(this.list.querySelectorAll('[data-part]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-part') === id ? 'true' : 'false');
    });
    var stats = this.gl ? this.gl.show(id, !initial) : null;
    this.renderInfo(p, stats);
    if (this.status) this.status.textContent = 'Showing example part ' + p.dwg + ', ' + p.name + '.';
    this.root.dispatchEvent(new CustomEvent('tp:part', { bubbles: true, detail: { id: id, dwg: p.dwg, name: p.name } }));
  };

  Viewer.prototype.attachGL = function () {
    var T = window.THREE;
    if (!T) throw new Error('3D library unavailable');
    this.gl = new GL(this, T);
    this.select(this.current.id, true);
  };

  /* ------------------------------------------------------------------
     WebGL side
     ------------------------------------------------------------------ */
  function GL(viewer, T) {
    var self = this;
    this.v = viewer; this.T = T;
    this.port = viewer.port;
    this.canvas = this.port.querySelector('canvas');
    this.Builder = makeBuilderClass(T);
    this.S = makeSolids(T);
    this.models = makeModels(T, this.S);
    this.cache = {};
    this.mode = 'shaded';         // start shaded; Hidden line and Wireframe are a click away
    this.ortho = false;
    this.showDims = true;
    this.spin = !viewer.reduced;
    this.visible = true;
    this.dirty = true;

    var r = new T.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    r.setClearColor(0x000000, 0);
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.r = r;
    this.scene = new T.Scene();
    this.fov = 30;
    this.persp = new T.PerspectiveCamera(this.fov, 1, 0.01, 1000);
    this.orthoCam = new T.OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);
    this.st = { theta: PI / 4, phi: Math.acos(1 / Math.sqrt(3)), radius: 10, target: new T.Vector3() };

    var hemi = new T.HemisphereLight(0xffffff, 0x2c4a7a, 0.62);
    var key = new T.DirectionalLight(0xffffff, 0.62);
    key.position.set(0.6, 1, 0.8);
    this.key = key;
    this.lights = new T.Group(); this.lights.add(hemi); this.lights.add(key);
    this.scene.add(this.lights);

    this.css = getComputedStyle(this.port);
    var bg = (this.css.getPropertyValue('--vp-bg') || '#0f3b7c').trim();
    this.colors = { bg: new T.Color(bg), line: new T.Color(0xf2f8ff), hid: new T.Color(0x7fd6ff), dark: new T.Color(0x0b2552) };

    this.mats = {
      fill: new T.MeshBasicMaterial({ color: this.colors.bg, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: T.DoubleSide }),
      depth: new T.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: T.DoubleSide }),
      shaded: new T.MeshPhongMaterial({ color: 0xb9cde8, specular: 0x55657c, shininess: 34, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: T.DoubleSide }),
      line: new T.LineBasicMaterial({ color: this.colors.line, depthWrite: false }),
      cosm: new T.LineBasicMaterial({ color: this.colors.line, transparent: true, opacity: 0.55, depthWrite: false }),
      hid: new T.LineDashedMaterial({ color: this.colors.hid, dashSize: 0.06, gapSize: 0.045, transparent: true, opacity: 0.6, depthWrite: false, depthFunc: T.GreaterDepth }),
      dim: new T.LineBasicMaterial({ color: 0x8fe0ff, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false })
    };

    this.mesh = new T.Mesh(new T.BufferGeometry(), this.mats.fill);
    this.edges = new T.LineSegments(new T.BufferGeometry(), this.mats.line);
    this.cosm = new T.LineSegments(new T.BufferGeometry(), this.mats.cosm);
    this.silG = new T.BufferGeometry();
    this.sil = new T.LineSegments(this.silG, this.mats.line);
    this.edgesHid = new T.LineSegments(this.edges.geometry, this.mats.hid);
    this.silHid = new T.LineSegments(this.silG, this.mats.hid);
    this.dimLines = new T.LineSegments(new T.BufferGeometry(), this.mats.dim);
    this.mesh.renderOrder = 0;
    [this.edges, this.cosm, this.sil].forEach(function (o) { o.renderOrder = 1; });
    [this.edgesHid, this.silHid].forEach(function (o) { o.renderOrder = 2; o.visible = false; });
    this.dimLines.renderOrder = 3;
    [this.mesh, this.edges, this.cosm, this.sil, this.edgesHid, this.silHid, this.dimLines].forEach(function (o) {
      o.frustumCulled = false; self.scene.add(o);
    });
    // apply the starting style (setMode also relabels the view, which needs a loaded part)
    this.mesh.material = this.mode === 'hidden' ? this.mats.fill : this.mode === 'wire' ? this.mats.depth : this.mats.shaded;
    if (this.mode === 'shaded') { this.mats.line.color.copy(this.colors.dark); this.mats.cosm.color.copy(this.colors.dark); }
    this.port.setAttribute('data-mode', this.mode);

    // overlays
    this.cube = this.port.querySelector('[data-vw="cube"]');
    this.cubeFaces = this.cube ? Array.prototype.slice.call(this.cube.querySelectorAll('[data-face]')) : [];
    this.ucs = this.port.querySelector('[data-vw="ucs"]');
    this.dimEls = Array.prototype.slice.call(this.port.querySelectorAll('[data-vw="dim"]'));

    this.bindUI();
    this.bindPointer();
    var spinBtn = viewer.root.querySelector('[data-vw-toggle="spin"]');
    if (spinBtn) spinBtn.setAttribute('aria-pressed', this.spin ? 'true' : 'false');
    this.resize();
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(this.port);
    else window.addEventListener('resize', function () { self.resize(); });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        self.visible = es[0].isIntersecting; if (self.visible) self.kick();
      }, { rootMargin: '100px' }).observe(this.port);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) self.kick(); });
    this.port.classList.add('is-live');
    this.last = performance.now();
    this.kick();
  }

  GL.prototype.build = function (id) {
    if (this.cache[id]) return this.cache[id];
    var T = this.T, B = new this.Builder();
    this.models[id](B);
    // center on the bounding box
    var P = B.P, i, mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (i = 0; i < P.length; i += 3) for (var k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i + k]); mx[k] = Math.max(mx[k], P[i + k]); }
    var c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
    function shift(arr, stride, count) {
      for (var j = 0; j < arr.length; j += stride) for (var q = 0; q < count; q++) for (var a = 0; a < 3; a++) arr[j + q * 3 + a] -= c[a];
    }
    shift(B.P, 3, 1); shift(B.E, 6, 2); shift(B.C, 6, 2); shift(B.S, 12, 2);
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(B.P, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(B.N, 3));
    var e = lineGeom(T, B.E), cm = lineGeom(T, B.C);
    var size = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
    var part = {
      mesh: g, edges: e, cosm: cm, sil: new Float32Array(B.S), size: size,
      radius: Math.hypot(size[0], size[1], size[2]) / 2,
      stats: { x: size[0], y: size[1], z: size[2], features: B.features }
    };
    this.cache[id] = part;
    return part;
  };

  function lineGeom(T, arr) {
    var g = new T.BufferGeometry();
    var pos = new Float32Array(arr), n = pos.length / 3, dist = new Float32Array(n), acc = 0;
    // cumulative distance along connected chains so hidden-line dashes flow around curves
    for (var i = 0; i < n; i += 2) {
      var connected = i > 0 && Math.abs(pos[i * 3] - pos[(i - 1) * 3]) < 1e-7 && Math.abs(pos[i * 3 + 1] - pos[(i - 1) * 3 + 1]) < 1e-7 && Math.abs(pos[i * 3 + 2] - pos[(i - 1) * 3 + 2]) < 1e-7;
      if (!connected) acc = 0;
      var L = Math.hypot(pos[i * 3 + 3] - pos[i * 3], pos[i * 3 + 4] - pos[i * 3 + 1], pos[i * 3 + 5] - pos[i * 3 + 2]);
      dist[i] = acc; acc += L; dist[i + 1] = acc;
    }
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('lineDistance', new T.BufferAttribute(dist, 1));
    return g;
  }

  GL.prototype.show = function (id, animate) {
    var T = this.T, p = this.build(id);
    this.part = p;
    this.mesh.geometry = p.mesh;
    this.edges.geometry = p.edges; this.edgesHid.geometry = p.edges;
    this.cosm.geometry = p.cosm;
    var nSil = p.sil.length / 12;
    var pos = new Float32Array(Math.max(2, nSil * 2) * 3), dist = new Float32Array(Math.max(2, nSil * 2));
    this.silG.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
    this.silG.setAttribute('lineDistance', new T.BufferAttribute(dist, 1).setUsage(T.DynamicDrawUsage));
    var s = p.radius;
    this.mats.hid.dashSize = s * 0.035; this.mats.hid.gapSize = s * 0.025;
    this.buildDims(p);
    var target = { theta: VIEWS.start.theta, phi: VIEWS.start.phi, radius: this.fitRadius(p) };
    if (animate && !this.v.reduced) this.animateTo(target);
    else { this.st.theta = target.theta; this.st.phi = target.phi; this.st.radius = target.radius; }
    this.st.target.set(0, 0, 0);
    this.setViewName(VIEWS.start.name);
    this.kick();
    return p.stats;
  };

  GL.prototype.fitRadius = function (p) {
    var w = this.port.clientWidth || 1, h = this.port.clientHeight || 1, aspect = w / h;
    var half = this.fov / 2 * PI / 180;
    var fit = p.radius / Math.sin(half);
    if (aspect < 1) fit /= Math.max(aspect, 0.55);
    return fit * 1.18;
  };

  GL.prototype.buildDims = function (p) {
    var T = this.T, sx = p.size[0] / 2, sy = p.size[1] / 2, sz = p.size[2] / 2;
    var off = p.radius * 0.18, ext = off * 0.25, ar = p.radius * 0.045, L = [];
    function seg(a, b) { L.push(a[0], a[1], a[2], b[0], b[1], b[2]); }
    function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
    function sc(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
    var dims = [];
    function dim(a, b, o, value) {
      var a2 = add(a, sc(o, off)), b2 = add(b, sc(o, off));
      seg(add(a, sc(o, off * 0.15)), add(a, sc(o, off + ext)));
      seg(add(b, sc(o, off * 0.15)), add(b, sc(o, off + ext)));
      seg(a2, b2);
      var d = [b2[0] - a2[0], b2[1] - a2[1], b2[2] - a2[2]], len = Math.hypot(d[0], d[1], d[2]);
      d = sc(d, 1 / len);
      [[a2, 1], [b2, -1]].forEach(function (q) {
        var tip = q[0], s = q[1];
        seg(tip, add(add(tip, sc(d, ar * s)), sc(o, ar * 0.32)));
        seg(tip, add(add(tip, sc(d, ar * s)), sc(o, -ar * 0.32)));
      });
      dims.push({ mid: add(sc(add(a2, b2), 0.5), sc(o, ar * 0.9)), value: value });
    }
    dim([-sx, -sy, sz], [sx, -sy, sz], [0, 0, 1], p.size[0]);
    dim([sx, -sy, sz], [sx, -sy, -sz], [1, 0, 0], p.size[2]);
    dim([-sx, -sy, sz], [-sx, sy, sz], [-1, 0, 0], p.size[1]);
    this.dimLines.geometry.dispose();
    this.dimLines.geometry = new T.BufferGeometry();
    this.dimLines.geometry.setAttribute('position', new T.Float32BufferAttribute(L, 3));
    this.dims = dims;
    this.dimEls.forEach(function (el, i) {
      var dd = dims[i];
      el.innerHTML = fmtIn(dd.value) + '<small>[' + (dd.value * 25.4).toFixed(1) + ']</small>';
    });
  };

  GL.prototype.cam = function () { return this.ortho ? this.orthoCam : this.persp; };

  GL.prototype.applyCam = function () {
    var st = this.st, T = this.T;
    st.phi = Math.min(PI - 0.0006, Math.max(0.0006, st.phi));
    var sp = Math.sin(st.phi);
    var off = new T.Vector3(st.radius * sp * Math.sin(st.theta), st.radius * Math.cos(st.phi), st.radius * sp * Math.cos(st.theta));
    var w = this.port.clientWidth || 1, h = this.port.clientHeight || 1, aspect = w / h;
    var hh = st.radius * Math.tan(this.fov / 2 * PI / 180);
    var o = this.orthoCam;
    o.left = -hh * aspect; o.right = hh * aspect; o.top = hh; o.bottom = -hh;
    o.near = 0.01; o.far = st.radius * 6;
    this.persp.aspect = aspect; this.persp.near = st.radius / 50; this.persp.far = st.radius * 6;
    [this.persp, o].forEach(function (c) {
      c.position.copy(st.target).add(off); c.up.set(0, 1, 0); c.lookAt(st.target);
      c.updateProjectionMatrix(); c.updateMatrixWorld();
    });
    // key light rides with the camera, up and to the left
    var cam = this.cam();
    this.key.position.copy(cam.position).add(new T.Vector3(0, st.radius * 0.6, 0));
  };

  GL.prototype.updateSil = function () {
    var p = this.part, S = p.sil, n = S.length / 12, cam = this.cam();
    var pos = this.silG.attributes.position.array, dist = this.silG.attributes.lineDistance.array;
    var cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    var vd = new this.T.Vector3(); cam.getWorldDirection(vd);
    var k = 0;
    for (var i = 0; i < n; i++) {
      var o = i * 12, vx, vy, vz;
      if (this.ortho) { vx = vd.x; vy = vd.y; vz = vd.z; }
      else { vx = (S[o] + S[o + 3]) / 2 - cx; vy = (S[o + 1] + S[o + 4]) / 2 - cy; vz = (S[o + 2] + S[o + 5]) / 2 - cz; }
      var s1 = S[o + 6] * vx + S[o + 7] * vy + S[o + 8] * vz;
      var s2 = S[o + 9] * vx + S[o + 10] * vy + S[o + 11] * vz;
      if (s1 * s2 <= 0) {
        var q = k * 6;
        pos[q] = S[o]; pos[q + 1] = S[o + 1]; pos[q + 2] = S[o + 2];
        pos[q + 3] = S[o + 3]; pos[q + 4] = S[o + 4]; pos[q + 5] = S[o + 5];
        dist[k * 2] = 0; dist[k * 2 + 1] = Math.hypot(S[o + 3] - S[o], S[o + 4] - S[o + 1], S[o + 5] - S[o + 2]);
        k++;
      }
    }
    this.silG.attributes.position.needsUpdate = true;
    this.silG.attributes.lineDistance.needsUpdate = true;
    this.silG.setDrawRange(0, k * 2);
  };

  GL.prototype.setMode = function (mode) {
    this.mode = mode;
    var dark = mode === 'shaded';
    this.mesh.material = mode === 'hidden' ? this.mats.fill : mode === 'wire' ? this.mats.depth : this.mats.shaded;
    this.mats.line.color.copy(dark ? this.colors.dark : this.colors.line);
    this.mats.cosm.color.copy(dark ? this.colors.dark : this.colors.line);
    this.edgesHid.visible = this.silHid.visible = mode === 'wire';
    this.port.setAttribute('data-mode', mode);
    this.setViewName();
    this.kick();
  };

  GL.prototype.setViewName = function (name) {
    if (name) this.viewName = name;
    var lbl = this.v.label;
    var m = { hidden: 'Hidden Line', wire: 'Wireframe', shaded: 'Shaded w/ Edges' }[this.mode];
    if (lbl) lbl.textContent = '[–][' + this.viewName + '][' + m + '][' + (this.ortho ? 'Parallel' : 'Perspective') + ']';
    this.port.setAttribute('aria-label', '3D view of example part: ' + this.v.current.name + '. ' + this.viewName + ' view, ' + m + '. Drag to rotate.');
  };

  var VIEWS = {
    front: { theta: 0, phi: PI / 2, name: 'Front' },
    back: { theta: PI, phi: PI / 2, name: 'Back' },
    right: { theta: PI / 2, phi: PI / 2, name: 'Right' },
    left: { theta: -PI / 2, phi: PI / 2, name: 'Left' },
    top: { theta: 0, phi: 0.0006, name: 'Top' },
    bottom: { theta: 0, phi: PI - 0.0006, name: 'Bottom' },
    iso: { theta: PI / 4, phi: Math.acos(1 / Math.sqrt(3)), name: 'SE Isometric' },
    // starting view: from the south-east corner, looking down at 30 degrees (phi is measured from straight above)
    start: { theta: PI / 4, phi: PI / 3, name: 'SE 30°' }
  };

  GL.prototype.view = function (key) {
    var v = VIEWS[key]; if (!v) return;
    this.stopSpin();
    var t = { theta: v.theta, phi: v.phi, radius: this.fitRadius(this.part) };
    this.st.target.set(0, 0, 0);
    if (this.v.reduced) { this.st.theta = t.theta; this.st.phi = t.phi; this.st.radius = t.radius; }
    else this.animateTo(t);
    this.setViewName(v.name);
    this.kick();
  };

  GL.prototype.animateTo = function (t) {
    var st = this.st, from = { theta: st.theta, phi: st.phi, radius: st.radius };
    var dt = t.theta - from.theta;
    dt = ((dt + PI) % TAU + TAU) % TAU - PI; // shortest way round
    this.anim = { from: from, to: { theta: from.theta + dt, phi: t.phi, radius: t.radius }, t0: performance.now(), dur: 520 };
  };

  GL.prototype.stopSpin = function () {
    if (!this.spin) return;
    this.spin = false;
    var b = this.v.root.querySelector('[data-vw-toggle="spin"]');
    if (b) b.setAttribute('aria-pressed', 'false');
  };

  GL.prototype.kick = function () {
    var self = this;
    this.dirty = true;
    if (this.raf) return;
    this.raf = requestAnimationFrame(function (now) { self.raf = 0; self.frame(now); });
  };

  GL.prototype.frame = function (now) {
    var dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    var moving = false, st = this.st;
    if (this.anim) {
      var a = this.anim, k = Math.min(1, (now - a.t0) / a.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      st.theta = a.from.theta + (a.to.theta - a.from.theta) * e;
      st.phi = a.from.phi + (a.to.phi - a.from.phi) * e;
      st.radius = a.from.radius + (a.to.radius - a.from.radius) * e;
      if (k >= 1) this.anim = null;
      moving = true;
    } else if (this.spin && this.visible && !document.hidden && !this.dragging) {
      st.theta += dt * 0.32;
      moving = true;
    }
    if (this.dirty || moving) {
      this.render();
      this.dirty = false;
    }
    if ((moving || this.anim) && this.visible && !document.hidden) this.kick();
  };

  GL.prototype.render = function () {
    if (!this.part) return;
    this.applyCam();
    this.updateSil();
    var cam = this.cam();
    this.dimLines.visible = this.showDims;
    this.r.render(this.scene, cam);
    this.syncOverlays(cam);
  };

  // View cube faces in world axes: n = outward normal (also the centre, times the half size),
  // u = the face's "right" and w = its "down" as its label reads, so the text sits upright like CAD view cubes.
  var CUBE_FACES = {
    front:  { n: [0, 0, 1],  u: [1, 0, 0],  w: [0, -1, 0] },
    back:   { n: [0, 0, -1], u: [-1, 0, 0], w: [0, -1, 0] },
    right:  { n: [1, 0, 0],  u: [0, 0, -1], w: [0, -1, 0] },
    left:   { n: [-1, 0, 0], u: [0, 0, 1],  w: [0, -1, 0] },
    top:    { n: [0, 1, 0],  u: [1, 0, 0],  w: [0, 0, 1] },
    bottom: { n: [0, -1, 0], u: [1, 0, 0],  w: [0, 0, -1] }
  };

  GL.prototype.syncOverlays = function (cam) {
    var T = this.T, w = this.port.clientWidth, h = this.port.clientHeight;
    // view cube: each face facing the camera gets a flat 2D transform (no CSS 3D, which Safari can draw
    // flattened); faces turned away are hidden, so they can't be clicked through the cube
    if (this.cube) {
      var e = cam.matrixWorldInverse.elements;
      // world direction -> screen (x right, y down), rotation only, like an orthographic view
      var scr = function (v) { return [e[0] * v[0] + e[4] * v[1] + e[8] * v[2], -(e[1] * v[0] + e[5] * v[1] + e[9] * v[2])]; };
      var depth = function (v) { return e[2] * v[0] + e[6] * v[1] + e[10] * v[2]; };
      var r = 25, fmt = function (x) { return Math.abs(x) < 1e-6 ? 0 : +x.toFixed(5); };
      this.cubeFaces.forEach(function (el) {
        var f = CUBE_FACES[el.getAttribute('data-face')];
        var show = depth(f.n) > 0.02;
        el.style.visibility = show ? '' : 'hidden';
        if (!show) return;
        var u = scr(f.u), w = scr(f.w), c = scr(f.n);
        el.style.transform = 'matrix(' + [u[0], u[1], w[0], w[1], c[0] * r, c[1] * r].map(fmt).join(',') + ')';
      });
    }
    // UCS icon
    if (this.ucs) {
      var axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], self = this;
      axes.forEach(function (ax, i) {
        var v = new T.Vector3().fromArray(ax).transformDirection(cam.matrixWorldInverse);
        var x2 = 26 + v.x * 20, y2 = 34 - v.y * 20;
        var ln = self.ucs.querySelector('[data-axis="' + i + '"]'), tx = self.ucs.querySelector('[data-axis-label="' + i + '"]');
        if (ln) { ln.setAttribute('x2', x2.toFixed(1)); ln.setAttribute('y2', y2.toFixed(1)); ln.style.opacity = 0.35 + 0.65 * Math.min(1, Math.hypot(v.x, v.y) * 1.4); }
        if (tx) { tx.setAttribute('x', (26 + v.x * 28).toFixed(1)); tx.setAttribute('y', (37 - v.y * 28).toFixed(1)); tx.style.opacity = Math.min(1, Math.hypot(v.x, v.y) * 1.6); }
      });
    }
    // dimension labels
    var show = this.showDims && !document.body.classList.contains('layer-off-dim');
    this.dimLines.visible = show;
    for (var i = 0; i < this.dimEls.length; i++) {
      var el = this.dimEls[i], d = this.dims && this.dims[i];
      if (!d || !show) { el.style.display = 'none'; continue; }
      var v = new T.Vector3(d.mid[0], d.mid[1], d.mid[2]).project(cam);
      var x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h;
      el.style.display = 'block';
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%)';
    }
  };

  GL.prototype.resize = function () {
    var w = this.port.clientWidth, h = this.port.clientHeight;
    if (!w || !h) return;
    this.r.setSize(w, h, false);
    this.kick();
  };

  GL.prototype.bindUI = function () {
    var self = this, root = this.v.root;
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-vw-view],[data-vw-mode],[data-vw-toggle],[data-vw-zoom]');
      if (!b || !root.contains(b)) return;
      if (b.hasAttribute('data-vw-view')) self.view(b.getAttribute('data-vw-view'));
      else if (b.hasAttribute('data-vw-mode')) {
        self.setMode(b.getAttribute('data-vw-mode'));
        Array.prototype.forEach.call(root.querySelectorAll('[data-vw-mode]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      } else if (b.hasAttribute('data-vw-zoom')) {
        self.stopSpin();
        self.st.radius *= b.getAttribute('data-vw-zoom') === 'in' ? 0.8 : 1.25;
        self.kick();
      } else {
        var k = b.getAttribute('data-vw-toggle'), on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (k === 'ortho') { self.ortho = on; self.setViewName(); }
        if (k === 'dims') self.showDims = on;
        if (k === 'spin') self.spin = on;
        self.kick();
      }
    });
    document.addEventListener('tp:layers', function () { self.kick(); });
  };

  GL.prototype.bindPointer = function () {
    var self = this, port = this.port, pts = {}, lastPinch = 0, lastMid = null;
    var hint = port.querySelector('[data-vw="hint"]'), hintTimer = 0;
    function count() { return Object.keys(pts).length; }
    function pan(dx, dy) {
      var T = self.T, cam = self.cam(), st = self.st;
      var h = port.clientHeight || 1;
      var scale = 2 * st.radius * Math.tan(self.fov / 2 * PI / 180) / h;
      var right = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
      var up = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      st.target.addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale);
    }
    port.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      port.classList.add('is-active');
      port.setPointerCapture(e.pointerId);
      pts[e.pointerId] = { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey };
      self.dragging = true; self.stopSpin(); self.anim = null;
      lastPinch = 0; lastMid = null;
    });
    port.addEventListener('pointermove', function (e) {
      var p = pts[e.pointerId]; if (!p) return;
      var dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (count() === 1) {
        if (p.b === 2 || p.b === 1 || p.shift) pan(dx, dy);
        else { self.st.theta -= dx * 0.008; self.st.phi -= dy * 0.008; self.setViewName('Orbit'); }
      } else if (count() === 2) {
        var ids = Object.keys(pts), a = pts[ids[0]], b = pts[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (lastPinch) self.st.radius *= lastPinch / d;
        if (lastMid) pan(mid.x - lastMid.x, mid.y - lastMid.y);
        lastPinch = d; lastMid = mid;
      }
      self.kick();
    });
    function up(e) {
      delete pts[e.pointerId];
      lastPinch = 0; lastMid = null;
      if (!count()) self.dragging = false;
    }
    port.addEventListener('pointerup', up);
    port.addEventListener('pointercancel', up);
    port.addEventListener('pointerleave', function () { port.classList.remove('is-active'); });
    port.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    port.addEventListener('wheel', function (e) {
      if (!(e.ctrlKey || e.metaKey || port.classList.contains('is-active'))) {
        if (hint) { hint.classList.add('is-shown'); clearTimeout(hintTimer); hintTimer = setTimeout(function () { hint.classList.remove('is-shown'); }, 1400); }
        return;
      }
      e.preventDefault();
      self.stopSpin();
      self.st.radius *= Math.exp(e.deltaY * 0.0012);
      self.kick();
    }, { passive: false });
    port.addEventListener('dblclick', function () { self.view('start'); });
    port.addEventListener('keydown', function (e) {
      var k = e.key, st = self.st, used = true;
      if (k === 'ArrowLeft') st.theta += 0.12;
      else if (k === 'ArrowRight') st.theta -= 0.12;
      else if (k === 'ArrowUp') st.phi -= 0.12;
      else if (k === 'ArrowDown') st.phi += 0.12;
      else if (k === '+' || k === '=') st.radius *= 0.85;
      else if (k === '-' || k === '_') st.radius *= 1.18;
      else used = false;
      if (used) { e.preventDefault(); self.stopSpin(); self.kick(); }
    });
    // view cube faces
    if (this.cube) this.cube.addEventListener('click', function (e) {
      var f = e.target.closest('[data-face]'); if (f) self.view(f.getAttribute('data-face'));
    });
  };

  /* ==================================================================
     Boot
     ================================================================== */
  window.TPViewer = {
    catalog: CATALOG,
    init: function (root) {
      var v = new Viewer(root);
      try { v.attachGL(); }
      catch (err) {
        root.classList.add('vw-no-gl');
        var fb = root.querySelector('[data-vw="fallback"]');
        if (fb) fb.hidden = false;
        if (window.console) console.warn('3D viewer unavailable:', err && err.message);
      }
      return v;
    }
  };
})();
