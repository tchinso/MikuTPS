const assetPath = (kind, fileName) => `${import.meta.env.BASE_URL}assets/models/characters/${kind}/${fileName}`;

export const assetManifest = [
  ['miku', 'miku.glb', '5C0DF2C7FD2F500C1A50AA0C293F9EABDD80659DBC8B0B806575A3CCB21E4F5A'],
  ['nari', 'navi-kemonomimi.glb', 'F7587E6A1E9E460419CC930EB56891011061A67D73387DEE50235841B7EC9AE4'],
  ['bibi', 'tiny-adventurer.glb', '1BA583B4041EEBF2877CED3EA152F2706569E9C1BE07DDD405FCF0E4814DFC97'],
  ['serin', 'nurse-twintail.glb', '7626CED73D1E1D1FCA39B993EEC78E3D4799EB9B67FB2C646F289940FC794123'],
  ['noir', 'fallen-angel.glb', '288EE60A458713A8DBFA6C312AC8E7B7D09289A556ACD951EAE0AF356DE5B807'],
  ['mora', 'gothic-doll.glb', 'F9D195CF4E851EC9E1E6F0308A0677F125948AC6ED7C95A8ECB985836D0E8032'],
  ['roa', 'beret-scout.glb', '3E3C67918F8D63C16129A7F925D37C91C856E49933C6B79550BE2539AE12E2B6'],
  ['marin', 'swimsuit-runner.glb', '9045D96C445D8493E3FE0F09015830EABFDEDC39D3C112F839C76C0756359465'],
  ['jigsaw', 'puzzle-tech.glb', '8A65CE71EEFCCC7CF8F36A6F875BE5591CB6471D0146E19DD3AF3C90C2EBE383'],
  ['yura', 'fox-spark.glb', 'C5735534A7990A310F0F51A17D22169C568B9F681F714C978B5C947925360184'],
  ['lumi', 'pajama-dreamer.glb', 'DDCCC1332D9A70F0457438597823EBC4E433B9A0B9C0D1BD859D4315E344DBF5'],
  ['sora', 'school-swimmer.glb', 'C5519EF4EC86DD0711AC1E6AB2C0501BD8A12A3E84B1113D251BD93D00DD0455'],
  ['neko', 'cat-street.glb', 'A8B268F0FBEF4E590EB2A9A405429F51C7403B7EBAA6C8515427AB7F77C7EA55']
].map(([characterId, fileName, sha256]) => ({
  characterId,
  fileName,
  rawPath: assetPath('raw', fileName),
  runtimePath: assetPath('runtime', fileName),
  sha256,
  licenseStatus: 'unverified',
  rigProfile: 'static-mesh-unrigged',
  weaponSocket: 'runtime-virtual-muzzle',
  animationProfile: 'procedural-placeholder',
  requiresRigging: true,
  inspection: { skins: 0, joints: 0, animations: 0, inspectedAt: '2026-06-23' },
  optimized: false
}));

export const duplicateAssets = [{
  fileName: 'nurse-twintail-duplicate.glb',
  duplicateOf: 'nurse-twintail.glb',
  sha256: '7626CED73D1E1D1FCA39B993EEC78E3D4799EB9B67FB2C646F289940FC794123'
}];
