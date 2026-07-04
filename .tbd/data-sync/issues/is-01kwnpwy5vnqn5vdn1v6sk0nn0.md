---
type: is
id: is-01kwnpwy5vnqn5vdn1v6sk0nn0
title: "Unit 05 coordination: rebase onto RoomStream; per-mesh book raycast seam"
kind: task
status: open
priority: 2
version: 1
labels:
  - unit-05
  - seam
dependencies: []
created_at: 2026-07-04T04:41:27.995Z
updated_at: 2026-07-04T04:41:27.995Z
---
Coordination note for Unit 05 (book reading, docs/tasks/ongoing/05-book-reading/) — Unit 04 landed the RoomStream restructure it must build on. Whoever implements Unit 05:

1. MERGE ORDER (04 spec §4.5): Unit 04's feat/04-staircase (PR #2) lands first; Unit 05 rebases its WorldScene/scene additions onto it — the diff is smaller in that direction. WorldScene.tsx no longer composes Room/Shaft/Vestibule/Shelves/BookWalls/Bulbs directly; it composes RoomStream + EdgeVeil, and LocomotionController takes initialCoordinate + onCommit + footsteps props.
2. BOOK RAYCAST SEAM (frozen): books are ELEVEN per-room 640-instance meshes (src/presentation/render/world/RoomStream.tsx), not one. instanceId === slot holds PER MESH (slotToBook(instanceId) unchanged, room/instancing.ts untouched/frozen). Room identity = WHICH mesh the ray hit: the mesh's parent Group.userData carries { roomKey, dn, dfloor, coordinate (bigint n/floor) }. A raycast through a doorway can legally hit a NEIGHBOR room's books — Unit 05 must explicitly target the current room's mesh (dn===0 && dfloor===0) or accept neighbor hits deliberately. LineAddress = hit mesh's userData.coordinate + slotToBook(instanceId).
3. CAMERA SEAM (frozen, unchanged shape): LocomotionHandle { suspend(), resume(), state } on LocomotionController — suspend before taking the camera for reading, resume returns walking from wherever the camera was left. state.coordinate is now LIVE (traversal), no longer pinned ORIGIN.
4. BULB/AUDIO: don't add emitters per book interaction to new contexts — reuse the app-lifetime bus (page rustle = one more emitter, per audio-doctrine).
5. Doctrine to load first: docs/doctrine/traversal-doctrine.md (new in a712dcb) + render-doctrine §2/§4 (amended 6b9ac2a with the per-mesh seam wording).
