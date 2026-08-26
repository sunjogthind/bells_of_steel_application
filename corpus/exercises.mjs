/**
 * Exercise library — WRITTEN BY US for this demo.
 *
 * This is the one piece of the corpus that is not Bells of Steel's. Their real
 * programming lives inside their training app and is not public, and inventing
 * a version of it would be exactly the failure this whole project argues
 * against. So this is a stand-in, clearly labelled as such everywhere it
 * surfaces, with the same shape their library would need. Swapping it for
 * theirs is a data change, not a code change.
 *
 * equipment: ALL listed items are required unless the id ends in "|alt".
 */
const E = (id, name, pattern, primary, equipment, difficulty, cues, mods, aliases = []) =>
  ({ id, name, pattern, primary, equipment, difficulty, cues, mods, aliases });

export const EXERCISES = [
  // ---------- squat ----------
  E('back-squat', 'Back Squat', 'squat', ['quads', 'glutes'], ['rack', 'barbell', 'plates'], 2,
    ['Brace before you unrack, not after', 'Knees track over the middle of the foot', 'Drive the whole foot into the floor'],
    ['Box squat to a target if depth is inconsistent', 'Safety straps set at the bottom of your range'], ['squat', 'barbell squat']),
  E('front-squat', 'Front Squat', 'squat', ['quads', 'core'], ['rack', 'barbell', 'plates'], 3,
    ['Elbows high, bar stays on the shoulders not the hands', 'Stay upright — let the knees travel'],
    ['Cross-arm grip if wrist mobility is the limit', 'Goblet squat is the same pattern, less demanding'], ['front squat']),
  E('goblet-squat', 'Goblet Squat', 'squat', ['quads', 'glutes'], ['kettlebell'], 1,
    ['Hold the bell at chest height, elbows inside the knees at the bottom', 'Sit down between the hips'],
    ['Use a dumbbell if you have no kettlebell', 'Elevate the heels on plates for depth'], ['goblet']),
  E('bw-squat', 'Bodyweight Squat', 'squat', ['quads'], ['bodyweight'], 1,
    ['Full depth before adding load', 'Hands out front as a counterweight'], ['Hold a doorframe to sit deeper'], ['air squat']),
  E('split-squat', 'Bulgarian Split Squat', 'lunge', ['quads', 'glutes'], ['bench_flat', 'dumbbells'], 2,
    ['Front shin roughly vertical', 'Rear leg is a kickstand, not a driver'],
    ['Bodyweight first — this is harder than it looks', 'Hold a rack upright for balance'], ['bulgarian', 'split squat']),
  E('walking-lunge', 'Walking Lunge', 'lunge', ['quads', 'glutes'], ['dumbbells'], 1,
    ['Step long for glutes, short for quads', 'Torso stays tall'], ['Bodyweight, or reverse lunge if knees complain'], ['lunge']),
  E('step-up', 'Box Step-Up', 'lunge', ['quads', 'glutes'], ['plyo_box', 'dumbbells'], 1,
    ['Drive through the heel of the top foot', "Don't push off the trailing leg"], ['Lower the box', 'Bodyweight only'], ['step up']),

  // ---------- hinge ----------
  E('deadlift', 'Conventional Deadlift', 'hinge', ['hamstrings', 'glutes', 'back'], ['barbell', 'plates'], 2,
    ['Take the slack out before you pull', 'Push the floor away rather than lifting the bar', 'Ribs down, neck neutral'],
    ['Pull from blocks or plates if the floor position is a struggle', 'Trap bar is a friendlier starting point'], ['deadlift', 'dl']),
  E('trap-bar-dl', 'Trap Bar Deadlift', 'hinge', ['quads', 'glutes', 'back'], ['trap_bar', 'plates'], 1,
    ['Handles in line with the middle of the foot', 'More upright than a straight bar'], ['High handles reduce the range'], ['trap bar deadlift', 'hex bar deadlift']),
  E('rdl', 'Romanian Deadlift', 'hinge', ['hamstrings', 'glutes'], ['barbell', 'plates'], 2,
    ['Push the hips back, do not bend the knees more as you go', 'Stop where the hamstrings stop, not where the floor is'],
    ['Dumbbell RDL is the same movement', 'Single-leg RDL if you have no load'], ['rdl', 'romanian deadlift']),
  E('kb-swing', 'Kettlebell Swing', 'hinge', ['glutes', 'hamstrings'], ['kettlebell'], 1,
    ['It is a hinge, not a squat', 'The bell floats — you do not lift it', 'Snap the glutes, then let it fall'],
    ['Start with a dead-stop swing from the floor'], ['swing', 'kb swing']),
  E('hip-thrust', 'Barbell Hip Thrust', 'hinge', ['glutes'], ['barbell', 'plates', 'bench_flat'], 2,
    ['Chin tucked, ribs down', 'Finish with the glutes, not the lower back'], ['Single-leg bodyweight thrust', 'Use a band instead of a bar'], ['hip thrust']),
  E('good-morning', 'Good Morning', 'hinge', ['hamstrings', 'back'], ['rack', 'barbell', 'plates'], 3,
    ['Light. Much lighter than you think', 'Same hinge as an RDL, bar on the back'], ['Band good morning to learn the pattern'], ['good morning']),
  E('back-ext', 'Back Extension', 'hinge', ['erectors', 'glutes'], ['ghd'], 1,
    ['Round and extend deliberately, do not swing'], ['Hold a plate for load'], ['back extension', 'hyper']),

  // ---------- horizontal push ----------
  E('bench-press', 'Barbell Bench Press', 'horizontal_push', ['chest', 'triceps'], ['rack', 'barbell', 'plates', 'bench_flat'], 2,
    ['Shoulder blades pinned down and back', 'Bar to the lower chest, elbows around 45°', 'Feet drive into the floor'],
    ['Use safety straps if pressing alone', 'Dumbbell press removes the fixed bar path'], ['bench', 'bench press']),
  E('db-bench', 'Dumbbell Bench Press', 'horizontal_push', ['chest', 'triceps'], ['bench_flat', 'dumbbells'], 1,
    ['Let the shoulder blades stay set', 'Do not clash the bells at the top'], ['Floor press if you have no bench'], ['db bench', 'dumbbell press']),
  E('incline-press', 'Incline Dumbbell Press', 'horizontal_push', ['upper chest', 'shoulders'], ['bench_adj', 'dumbbells'], 1,
    ['30–45° is plenty — steeper is a shoulder press'], ['Flat press if the bench does not adjust'], ['incline press', 'incline']),
  E('floor-press', 'Floor Press', 'horizontal_push', ['chest', 'triceps'], ['barbell', 'plates'], 2,
    ['Triceps touch, pause, press', 'Shortened range is easier on the shoulder'], ['Dumbbell floor press'], ['floor press']),
  E('pushup', 'Push-Up', 'horizontal_push', ['chest', 'triceps'], ['bodyweight'], 1,
    ['Body is a plank the whole time', 'Elbows back, not flared to the sides'],
    ['Hands on a bench to make it easier', 'Feet elevated to make it harder'], ['push up', 'pushups']),
  E('dip', 'Parallel Bar Dip', 'horizontal_push', ['chest', 'triceps'], ['dip_bars'], 2,
    ['Lean forward for chest, stay upright for triceps', 'Stop where the shoulder still feels safe'],
    ['Band-assisted dips', 'Bench dips as a regression'], ['dips', 'dip']),
  E('landmine-press', 'Landmine Press', 'horizontal_push', ['shoulders', 'chest'], ['landmine', 'barbell'], 1,
    ['Half-kneeling to stop the ribs flaring', 'Press up and slightly across'], ['Two hands if one is unstable'], ['landmine press']),

  // ---------- vertical push ----------
  E('ohp', 'Overhead Press', 'vertical_push', ['shoulders', 'triceps'], ['rack', 'barbell', 'plates'], 2,
    ['Squeeze the glutes so the lower back does not arch', 'Move the head back, then through at the top'],
    ['Seated press removes the leg drive', 'Dumbbells if the bar path bothers a wrist'], ['ohp', 'overhead press', 'press']),
  E('db-shoulder-press', 'Dumbbell Shoulder Press', 'vertical_push', ['shoulders'], ['dumbbells'], 1,
    ['Neutral grip is kinder to most shoulders'], ['Seated with a bench for more support'], ['shoulder press']),
  E('pike-pushup', 'Pike Push-Up', 'vertical_push', ['shoulders'], ['bodyweight'], 2,
    ['Hips high, crown of the head to the floor'], ['Feet on a box for more load'], ['pike push up']),
  E('kb-press', 'Kettlebell Strict Press', 'vertical_push', ['shoulders'], ['kettlebell'], 2,
    ['Rack position first — the press is easy once the rack is right'], ['Half-kneeling to remove the low back'], ['kb press']),

  // ---------- vertical pull ----------
  E('pullup', 'Pull-Up', 'vertical_pull', ['lats', 'biceps'], ['pullup_bar'], 2,
    ['Start from a dead hang, finish with the chest to the bar', 'Pull the elbows into the ribs'],
    ['Band assistance', 'Negatives only — 5 seconds down'], ['pull up', 'pullups', 'chin up']),
  E('lat-pulldown', 'Lat Pulldown', 'vertical_pull', ['lats'], ['cable'], 1,
    ['Chest up, drive the elbows down', 'Do not lean back to finish the rep'], ['Band pulldown from a rack pin'], ['pulldown', 'lat pulldown']),
  E('band-pulldown', 'Band Lat Pulldown', 'vertical_pull', ['lats'], ['bands', 'rack'], 1,
    ['Anchor high on the rack', 'Same cue — elbows down, not hands down'], [], ['band pulldown']),

  // ---------- horizontal pull ----------
  E('barbell-row', 'Barbell Row', 'horizontal_pull', ['back', 'lats'], ['barbell', 'plates'], 2,
    ['Hinge to about 45° and stay there', 'Row to the belly button, not the chest'],
    ['Chest-supported row if the lower back fatigues first', 'Pendlay row from the floor each rep'], ['row', 'barbell row', 'bent over row']),
  E('db-row', 'Single-Arm Dumbbell Row', 'horizontal_pull', ['back', 'lats'], ['dumbbells', 'bench_flat'], 1,
    ['Let the shoulder blade move — this is not a rigid pull', 'Elbow past the ribs'], ['Hand on a rack upright instead of a bench'], ['db row', 'dumbbell row', 'one arm row']),
  E('inverted-row', 'Inverted Row', 'horizontal_pull', ['back'], ['rack'], 1,
    ['Set the bar in the rack at hip height', 'Body stays rigid, chest to the bar'],
    ['Bend the knees to make it easier', 'Feet elevated to make it harder'], ['inverted row', 'body row']),
  E('seal-row', 'Seal Row', 'horizontal_pull', ['back'], ['bench_flat', 'barbell', 'plates'], 2,
    ['Chest stays down on the bench the whole set', 'Removes every bit of cheating from the row'], [], ['seal row']),
  E('cable-row', 'Seated Cable Row', 'horizontal_pull', ['back'], ['cable'], 1,
    ['Chest tall, ribs down', 'Pause a beat at the sternum'], ['Band row anchored to a rack'], ['cable row', 'seated row']),
  E('face-pull', 'Face Pull', 'horizontal_pull', ['rear delts', 'upper back'], ['cable'], 1,
    ['High to the eyes, not low to the chest', 'External rotation at the finish'], ['Band face pull'], ['face pull']),

  // ---------- carry / core ----------
  E('farmer-carry', 'Farmer Carry', 'carry', ['grip', 'core'], ['dumbbells'], 1,
    ['Tall posture, short quick steps', 'Time or distance, not reps'], ['Kettlebells or a trap bar work equally well'], ['farmers walk', 'carry']),
  E('suitcase-carry', 'Suitcase Carry', 'carry', ['core', 'obliques'], ['kettlebell'], 1,
    ['One side only — resist the lean', 'Ribs stacked over the hips'], [], ['suitcase carry']),
  E('plank', 'Plank', 'core', ['core'], ['bodyweight'], 1,
    ['Squeeze the glutes — a plank is not a hang', 'Quality seconds, not total seconds'], ['Knees down', 'Feet elevated'], ['plank']),
  E('hanging-leg-raise', 'Hanging Leg Raise', 'core', ['core', 'hip flexors'], ['pullup_bar'], 2,
    ['Posteriorly tilt the pelvis before the legs move', 'No swinging'], ['Knee raises', 'Lying leg raise'], ['leg raise']),
  E('ab-wheel', 'Ab Wheel Rollout', 'core', ['core'], ['bodyweight'], 3,
    ['Ribs down, glutes on', 'Only roll as far as you can keep the back flat'], ['From the knees, short range'], ['ab wheel', 'rollout']),
  E('pallof', 'Pallof Press', 'core', ['core', 'obliques'], ['bands'], 1,
    ['Anti-rotation — the point is that nothing moves'], ['Cable version if you have a tower'], ['pallof']),
  E('deadbug', 'Dead Bug', 'core', ['core'], ['bodyweight'], 1,
    ['Lower back stays flat against the floor', 'Slow — this is not a rep-chaser'], [], ['dead bug']),

  // ---------- arms ----------
  E('ez-curl', 'EZ Bar Curl', 'arms', ['biceps'], ['ez_curl', 'plates'], 1,
    ['Elbows stay at the ribs', 'Control the way down'], ['Dumbbell curl'], ['curl', 'bicep curl', 'ez curl']),
  E('db-curl', 'Dumbbell Curl', 'arms', ['biceps'], ['dumbbells'], 1,
    ['Supinate as you rise', 'No swinging from the hips'], [], ['dumbbell curl']),
  E('skullcrusher', 'Skullcrusher', 'arms', ['triceps'], ['ez_curl', 'plates', 'bench_flat'], 2,
    ['Elbows stay pointed at the ceiling'], ['Dumbbell version is easier on the elbows'], ['skullcrusher', 'tricep extension']),
  E('cable-pushdown', 'Cable Pushdown', 'arms', ['triceps'], ['cable'], 1,
    ['Elbows pinned, only the forearm moves'], ['Band pushdown'], ['pushdown', 'tricep pushdown']),
  E('chinup', 'Chin-Up', 'arms', ['biceps', 'lats'], ['pullup_bar'], 2,
    ['Supinated grip, full hang to chin over bar'], ['Band assisted'], ['chin up']),

  // ---------- conditioning ----------
  E('airbike', 'Air Bike Intervals', 'conditioning', ['full body'], ['bike'], 1,
    ['Hard means hard — the bike is honest', 'Equal work and rest to start'], ['Any machine works — the effort is the variable'], ['air bike', 'assault bike', 'bike intervals']),
  E('sled-push', 'Sled Push', 'conditioning', ['legs', 'full body'], ['sled'], 1,
    ['Low body angle, short steps', 'No eccentric — easy to recover from'], [], ['sled push', 'prowler']),
  E('kb-complex', 'Kettlebell Complex', 'conditioning', ['full body'], ['kettlebell'], 2,
    ['Pick three movements, no rest between them', 'Stop a rep short of grip failure'], [], ['kb complex', 'complex']),
  E('sandbag-carry', 'Sandbag Bear Hug Carry', 'conditioning', ['full body', 'core'], ['sandbag'], 2,
    ['Hug it high, breathe anyway'], [], ['sandbag carry']),
  E('mace-360', 'Macebell 360', 'conditioning', ['shoulders', 'core'], ['macebell'], 2,
    ['Start light. The leverage does the damage', 'Control behind the head'], [], ['mace 360', 'macebell']),
  E('burpee', 'Burpee', 'conditioning', ['full body'], ['bodyweight'], 1,
    ['Pace it — the first ten are a lie'], ['Step back instead of jumping'], ['burpees']),
  E('jump-rope', 'Jump Rope', 'conditioning', ['calves', 'full body'], ['bodyweight'], 1,
    ['Wrists, not arms', 'Small hops'], [], ['skipping', 'jump rope']),

  // ---------- warm-up ----------
  E('jumping-jacks', 'Jumping Jacks', 'warmup', ['full body'], ['bodyweight'], 1, ['Just raise the temperature'], [], ['jumping jacks']),
  E('arm-circles', 'Arm Circles', 'warmup', ['shoulders'], ['bodyweight'], 1, ['Both directions, controlled'], [], ['arm circles']),
  E('inchworm', 'Bodyweight Inchworm', 'warmup', ['hamstrings', 'core'], ['bodyweight'], 1, ['Walk the hands out, walk the feet in'], [], ['inchworm']),
  E('scap-pushup', 'Scapular Push-Up', 'warmup', ['scapula'], ['bodyweight'], 1,
    ['Arms stay straight — only the shoulder blades move'], ['Hands on an elevated surface to modify'], ['scap push up']),
  E('hip-90-90', '90/90 Hip Switch', 'warmup', ['hips'], ['bodyweight'], 1, ['Slow, no hands if you can'], [], ['90 90']),
  E('cat-cow', 'Cat-Cow', 'warmup', ['spine'], ['bodyweight'], 1, ['Segment the spine, do not just flex and extend'], [], ['cat cow']),
  E('band-pullapart', 'Band Pull-Apart', 'warmup', ['rear delts'], ['bands'], 1, ['High volume, low effort — great before pressing'], [], ['pull apart']),
  E('empty-bar', 'Empty Bar Warm-Up Set', 'warmup', ['full body'], ['barbell'], 1, ['Rehearse the exact movement you are about to load'], [], ['empty bar']),
];

export const PATTERNS = ['squat', 'hinge', 'lunge', 'horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'carry', 'core', 'arms', 'conditioning', 'warmup'];
