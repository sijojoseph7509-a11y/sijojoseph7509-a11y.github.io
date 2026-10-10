# Authors Shea's "sit" clip in Blender on the rig built by rig.py: IK pins her paws on the desk, the pelvis lowers and
# tips back (hindquarters first), the chest rises over straight front legs, the hocks fold flat, the tail wraps round.
# Baked to plain bone keys (visual keying), constraints removed.  Called from rig.py: make_sit(rig, frames=...)
import bpy, math, mathutils
V = mathutils.Vector
def make_sit(rig, P, render=None):
    sc = bpy.context.scene; sc.render.fps = 30
    bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="POSE")
    pb = rig.pose.bones
    for b in pb: b.rotation_mode = "QUATERNION"
    rest = {b.name: b.bone.matrix_local.copy() for b in pb}; rest_m = rest
    head_of = lambda n: rest[n].to_translation(); tail_of = lambda n: (rest[n] @ V((0, rig.data.bones[n].length, 0, 1))).to_3d()
    empties = {}
    def empty(name, at):
        e = bpy.data.objects.new(name, None); sc.collection.objects.link(e); e.location = at; empties[name] = e; return e
    def ik(bone, target, chain, pole=None, pole_angle=0):
        c = pb[bone].constraints.new("IK"); c.target = target; c.chain_count = chain; c.use_tail = True
        if pole: c.pole_target = pole; c.pole_angle = pole_angle
    def track(bone, target):
        c = pb[bone].constraints.new("DAMPED_TRACK"); c.target = target; c.track_axis = "TRACK_Y"
    legs = {}
    for s in ("L", "R"):
        # front: wrist (forearm tail) on IK, hand aims at the paw ball, fingers at the toe tip
        legs["fw" + s] = empty("fw" + s, tail_of("forearm" + s)); ik("forearm" + s, legs["fw" + s], 3)   # scapula in the chain: the shoulder blade slides, as in a real cat
        legs["fp" + s] = empty("fp" + s, head_of("forearm" + s) + V((0, 25, 0)))   # elbow pole: behind
        legs["fb" + s] = empty("fb" + s, tail_of("hand" + s)); track("hand" + s, legs["fb" + s])
        legs["ft" + s] = empty("ft" + s, tail_of("fingers" + s)); track("fingers" + s, legs["ft" + s])
        # hind: hock (shin tail) on IK, foot aims at the paw ball, toes at the toe tip
        legs["hh" + s] = empty("hh" + s, tail_of("shin" + s)); ik("shin" + s, legs["hh" + s], 2)
        legs["hp" + s] = empty("hp" + s, head_of("shin" + s) + V((0, -25, 0)))   # knee pole: in front
        legs["hb" + s] = empty("hb" + s, tail_of("foot" + s)); track("foot" + s, legs["hb" + s])
        legs["ht" + s] = empty("ht" + s, tail_of("toes" + s)); track("toes" + s, legs["ht" + s])
    tails = [n for n in ["tail0", "tail1", "tail2", "tail3", "tail4", "tail5"]]
    tpts = [empty("tp%d" % i, tail_of(n)) for i, n in enumerate(tails)]
    for n, e in zip(tails, tpts): track(n, e)
    rest_pos = {k: e.location.copy() for k, e in empties.items()}
    pelvis = head_of("hips")
    def about(c, ang_x):   # rotation about the world X axis through point c (negative = nose up: the head is at −Y)
        return mathutils.Matrix.Translation(c) @ mathutils.Matrix.Rotation(ang_x, 4, "X") @ mathutils.Matrix.Translation(-c)
    def pose(k):   # k = 0 standing … 1 sitting
        # hindquarters lead: the pelvis drops and tips first, the chest finishes rising at the end
        kh = min(1, k * 1.35); kc = max(0, (k - 0.25) / 0.75)
        e = lambda x: x * x * (3 - 2 * x)
        kh, kc = e(kh), e(kc)
        for b in pb: b.matrix_basis = mathutils.Matrix.Identity(4)
        bpy.context.view_layer.update()
        M = mathutils.Matrix.Translation((0, P["back"] * kh, P["drop"] * kh)) @ about(pelvis, math.radians(P["pitch"]) * kh)
        pb["hips"].matrix = M @ rest["hips"]; bpy.context.view_layer.update()
        for n, a in (("spine", P["spine"]), ("chest", P["chest"]), ("neck", P["neck"]), ("neck2", P["neck2"]), ("head", P["head"])):
            c = pb[n].head.copy(); pb[n].matrix = about(c, math.radians(a) * kc) @ pb[n].matrix; bpy.context.view_layer.update()
        for s, sx in (("L", 1), ("R", -1)):
            for key, dst in (("hh", P["hock"]), ("hb", P["hball"]), ("ht", P["htoe"])):
                r = rest_pos[key + s]; d = V((dst[0] * sx, dst[1], dst[2])); empties[key + s].location = r.lerp(d, kh)
            for key in ("fw", "fb", "ft"):
                r = rest_pos[key + s]; empties[key + s].location = r + V((-P["fin"] * sx, 0, 0)) * kc
        # tail: from straight back, down to the desk and round her right side toward the front paws
        kt = e(k)   # the tail sweeps round over the whole sit (evenly, no whip)
        for i, e_ in enumerate(tpts):
            r = rest_pos["tp%d" % i]; d = V(P["tail"][i]); e_.location = r.lerp(d, kt)
        bpy.context.view_layer.update()
    # calibrate each leg's pole angle so the standing pose is unchanged by the constraints
    pose(0)
    for s_ in ("L", "R"):
        for bone, pole, upper in (("forearm" + s_, empties["fp" + s_], "humerus" + s_), ("shin" + s_, empties["hp" + s_], "thigh" + s_)):
            c = [c for c in pb[bone].constraints if c.type == "IK"][0]; c.pole_target = pole; best = None
            for a_ in range(-180, 180, 5):
                c.pole_angle = math.radians(a_); bpy.context.view_layer.update()
                err = (pb[bone].head - rest_m[bone].to_translation()).length + (pb[bone].tail - tail_of(bone)).length + (pb[upper].head - rest_m[upper].to_translation()).length
                if best is None or err < best[0]: best = (err, a_)
            c.pole_angle = math.radians(best[1]); bpy.context.view_layer.update(); print("POLE", bone, best[1], "err", round(best[0], 3))
    # solve each key pose with the constraints, remember every bone's visual pose…
    order = [b.name for b in rig.data.bones]   # parents come before children
    shots = []
    for f, k in P["keys"]:
        pose(k); shots.append((f, {n: pb[n].matrix.copy() for n in order}))
    # …then drop the helpers and key those poses as plain bone transforms (smooth interpolation, nothing can flip)
    for b in pb:
        for c in list(b.constraints): b.constraints.remove(c)
    prevq = {}
    for f, mats in shots:
        sc.frame_set(f)
        for b in pb: b.matrix_basis = mathutils.Matrix.Identity(4)
        for n in order:
            pb[n].matrix = mats[n]; bpy.context.view_layer.update()
        for n in order:
            q = pb[n].rotation_quaternion.copy()
            if n in prevq and prevq[n].dot(q) < 0: q.negate(); pb[n].rotation_quaternion = q   # keep consecutive keys in the same hemisphere
            prevq[n] = q.copy()
            pb[n].keyframe_insert("rotation_quaternion", frame=f); pb[n].keyframe_insert("location", frame=f)
    sc.frame_start, sc.frame_end = P["keys"][0][0], P["keys"][-1][0]
    rig.animation_data.action.name = "sit"
    if render: render(sc.frame_end)
    for e in list(empties.values()):
        bpy.data.objects.remove(e, do_unlink=True)
    bpy.ops.object.mode_set(mode="OBJECT")
