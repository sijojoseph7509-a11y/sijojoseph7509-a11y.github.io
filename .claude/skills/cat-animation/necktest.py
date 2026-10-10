import bpy, sys, math, mathutils
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=sys.argv[-2])
rig = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]
if rig.animation_data: rig.animation_data.action = None
pb = rig.pose.bones
for n, (rx, rz) in {"neck": (0.12, 0.35), "neck2": (0.1, 0.35), "head": (0.05, 0.3)}.items():
    b = pb[n]; b.rotation_mode = "XYZ"; b.rotation_euler = (rx, 0, rz)
sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"; sc.render.resolution_x = 1000; sc.render.resolution_y = 800
sc.display.shading.show_cavity = True
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.type = "ORTHO"; cam.data.ortho_scale = 26
tgt = mathutils.Vector((0, -20, 26))
for name, d in [("side", (1, 0.15, 0.1)), ("front", (0.35, -1, 0.1)), ("other", (-1, -0.2, 0.1))]:
    d = mathutils.Vector(d).normalized(); cam.location = tgt + d * 120; cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = f"{sys.argv[-1]}_{name}.png"; bpy.ops.render.render(write_still=True)
