// The real archive.org answers this plugin is tested against: one tape per call, recorded with the kit's --record.
export const TAPES = [
  { file: "episodes-netlabel.json", fn: "episodes", args: ["item:NS050"] },
  { file: "episodes-librivox.json", fn: "episodes", args: ["item:alice_in_wonderland_librivox"] },
  { file: "episodes-etree.json", fn: "episodes", args: ["item:oar2006-01-14.mix.flac16"] },
  { file: "episodes-78rpm-single.json", fn: "episodes", args: ["item:78_el-capitan-march_sousas-band_gbia0479040a"] },
  { file: "resolve-netlabel.json", fn: "resolve", args: ["track:NS050/01-NS050-Multi-Panel_Christmas-With-Mr-Rice.mp3"] },
  { file: "search-caruso.json", fn: "search", args: ["caruso"] },
  { file: "home.json", fn: "home", args: [] },
  { file: "section.json", fn: "section", args: [] },
  { file: "categories.json", fn: "categories", args: [] },
];
