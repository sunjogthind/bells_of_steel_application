/**
 * Equipment vocabulary.
 *
 * These classes are OURS - a normalised way to describe what a person owns.
 * `match` maps each class onto the real Bells of Steel catalogue so that when a
 * program is limited by missing equipment, the recommendation points at an
 * actual product with an actual price rather than a generic suggestion.
 */
export const EQUIPMENT = [
  { id: 'bodyweight', label: 'Bodyweight only', match: null, aliases: ['nothing', 'no equipment', 'body weight'] },
  { id: 'rack', label: 'Power rack or squat stand', match: /power rack|squat stand|half rack|folding rack|cage/i,
    aliases: ['rack', 'cage', 'squat rack', 'hydra', 'manticore', 'power rack'] },
  { id: 'pullup_bar', label: 'Pull-up bar', match: /pull.?up bar|chin.?up/i, aliases: ['pull up bar', 'chin up bar', 'pullup'] },
  { id: 'barbell', label: 'Barbell', match: /barbell|olympic bar|utility bar|power bar/i,
    aliases: ['barbell', 'olympic bar', 'straight bar', 'power bar', 'utility bar'] },
  { id: 'plates', label: 'Weight plates', match: /weight plate|bumper plate|plate set|iron plate/i,
    aliases: ['plates', 'bumpers', 'weights', 'bumper plates'] },
  { id: 'bench_flat', label: 'Flat bench', match: /flat bench|utility bench/i, aliases: ['bench', 'flat bench'] },
  { id: 'bench_adj', label: 'Adjustable bench', match: /adjustable.*bench|fid bench|incline/i,
    aliases: ['adjustable bench', 'incline bench', 'fid'] },
  { id: 'dumbbells', label: 'Dumbbells', match: /dumbbell/i, aliases: ['dumbbells', 'dbs', 'db', 'adjustable dumbbells'] },
  { id: 'kettlebell', label: 'Kettlebell', match: /kettlebell/i, aliases: ['kettlebell', 'kb', 'kettle bell'] },
  { id: 'cable', label: 'Cable machine or lat tower', match: /cable|lat pulldown|functional trainer|tower/i,
    aliases: ['cable', 'lat pulldown', 'cable machine', 'functional trainer', 'lat tower'] },
  { id: 'landmine', label: 'Landmine attachment', match: /landmine/i, aliases: ['landmine'] },
  { id: 'dip_bars', label: 'Dip bars or dip attachment', match: /dip/i, aliases: ['dip bars', 'dips', 'dip station'] },
  { id: 'bands', label: 'Resistance bands', match: /band/i, aliases: ['bands', 'resistance bands'] },
  { id: 'trap_bar', label: 'Trap or hex bar', match: /trap bar|hex bar/i, aliases: ['trap bar', 'hex bar'] },
  { id: 'ez_curl', label: 'EZ curl bar', match: /ez curl|curl bar/i, aliases: ['ez bar', 'curl bar', 'ez curl'] },
  { id: 'ghd', label: 'GHD or back extension', match: /ghd|back extension|reverse hyper/i, aliases: ['ghd', 'back extension'] },
  { id: 'rings', label: 'Gymnastic rings', match: /ring/i, aliases: ['rings', 'gymnastic rings'] },
  { id: 'sandbag', label: 'Sandbag', match: /sandbag|strongman bag/i, aliases: ['sandbag', 'bag'] },
  { id: 'plyo_box', label: 'Plyo box', match: /plyo|box jump|jerk block/i, aliases: ['box', 'plyo box'] },
  { id: 'macebell', label: 'Macebell or club', match: /mace|club/i, aliases: ['macebell', 'mace', 'clubbell'] },
  { id: 'sled', label: 'Sled', match: /sled|prowler/i, aliases: ['sled', 'prowler'] },
  { id: 'bike', label: 'Air bike or cardio machine', match: /air bike|bike|rower|treadmill|stepper/i,
    aliases: ['bike', 'air bike', 'rower', 'cardio machine', 'treadmill'] },
];

export const EQUIPMENT_IDS = EQUIPMENT.map((e) => e.id);
