import provenance from '../../assets-source/asset-provenance.json';

const runtimeAssetPath = (fileName) => `${import.meta.env.BASE_URL}assets/models/characters/runtime/${fileName}`;

export const assetManifest = provenance.assets.map((asset) => ({
  ...asset,
  sourcePath: `assets-source/characters/${asset.fileName}`,
  runtimePath: runtimeAssetPath(asset.fileName)
}));

export const duplicateAssets = provenance.duplicates;
