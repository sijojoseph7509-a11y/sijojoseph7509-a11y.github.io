import bpy, mathutils, math
def load_cat(path):
    """Import the site's cat.glb and bake it to: cm, Z up, head toward -Y, paws on z = 0, centred on x/y."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    ob = [o for o in bpy.data.objects if o.type == "MESH"][0]
    ob.data.transform(ob.matrix_world); ob.matrix_world = mathutils.Matrix.Identity(4)
    ob.data.transform(mathutils.Matrix.Rotation(-math.pi / 2, 4, "X"))
    vs = [v.co for v in ob.data.vertices]; mn = [min(v[i] for v in vs) for i in range(3)]; mx = [max(v[i] for v in vs) for i in range(3)]
    ob.data.transform(mathutils.Matrix.Translation((-(mn[0] + mx[0]) / 2, -(mn[1] + mx[1]) / 2, -mn[2])))
    ob.data.update()
    vs = [v.co for v in ob.data.vertices]
    print("BBOX", [round(min(v[i] for v in vs), 2) for i in range(3)], [round(max(v[i] for v in vs), 2) for i in range(3)])
    return ob
