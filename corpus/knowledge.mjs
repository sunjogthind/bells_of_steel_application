/**
 * Coaching knowledge base — general training principles, written by us.
 *
 * These are the documents Spotter retrieves from when someone asks a "why" or
 * "how" question rather than asking for a program. Deliberately general: none
 * of this claims to be Bells of Steel's methodology.
 */
const D = (id, title, topic, body) => ({ id, title, topic, body });

export const KNOWLEDGE = [
  D('rpe', 'RPE and how to use it', 'intensity',
    `RPE is Rate of Perceived Exertion, scored 1–10, and it describes how close a set finished to failure. RPE 10 means no more reps were available. RPE 8 means roughly two were left. RPE 6 or below is warm-up territory. Most productive strength work sits between RPE 7 and 9. The value of RPE is that it self-corrects: on a bad day the same RPE means less weight on the bar, which is exactly what you want. Percentages of a one-rep max cannot do that, because they do not know you slept badly.`),
  D('progressive-overload', 'Progressive overload', 'programming',
    `Progress requires the demand to increase over time, but weight on the bar is only one way to do that. You can add reps at the same load, add a set, shorten rest, improve range of motion, or slow the eccentric. Beginners can usually add weight session to session. After the first year that stops working and progress comes in blocks of weeks rather than sessions. The most common mistake is adding load faster than technique consolidates.`),
  D('beginner-progression', 'Progression for a first year of training', 'programming',
    `In the first six to twelve months, a simple full-body routine performed two or three times a week outperforms anything more complicated. Add a small amount of weight each session while the reps stay clean. When you miss the target reps two sessions running, reduce the load by about ten percent and build back. Frequency matters more than variety at this stage, the same movement practised often is what drives the adaptation.`),
  D('split-fullbody', 'Full-body training', 'splits',
    `A full-body session trains every major pattern in one workout: a squat, a hinge, a push, a pull, and something for the trunk. It suits two or three training days a week because each pattern gets trained multiple times across the week. It is the highest-value structure for beginners and for anyone whose schedule is unpredictable, because missing one session costs you less.`),
  D('split-upper-lower', 'Upper/lower split', 'splits',
    `Alternating upper-body and lower-body days works well at four sessions a week, giving each half of the body two exposures. It allows more volume per session than full-body without the fatigue of training everything at once, and it recovers well because the trained tissue gets roughly 72 hours between sessions.`),
  D('split-ppl', 'Push/pull/legs', 'splits',
    `Push/pull/legs groups movements by function: pressing on one day, pulling on the next, lower body on the third. Run once through it trains each pattern weekly; run twice it becomes a six-day week with each pattern trained twice. It suits five or six available days and lifters past the beginner stage who need more volume per muscle group than a full-body day can absorb.`),
  D('warmup', 'How to warm up', 'session structure',
    `A warm-up has two jobs: raise temperature and rehearse the movement. Five minutes of general work, jumping jacks, a bike, a skipping rope, handles the first. The second is specific: work up to your first heavy set in three or four progressively heavier sets, doing exactly the movement you are about to load. Static stretching before lifting is not required and can blunt force production. Mobility work belongs after the session, or on its own day.`),
  D('rest-periods', 'How long to rest between sets', 'session structure',
    `Heavy compound sets in the one-to-five rep range want three to five minutes; the limiting factor is the nervous system, not the muscle. Hypertrophy work in the six-to-twelve range recovers adequately in ninety seconds to two minutes. Isolation and accessory work can go as low as sixty. Cutting rest short on heavy work reduces the load you can handle, which reduces the stimulus. You are not saving time; you are running a lighter session.`),
  D('volume', 'How much volume per muscle group', 'programming',
    `Ten to twenty hard sets per muscle group per week is the range most people respond to, with beginners doing well at the bottom of it. Sets taken to within a couple of reps of failure count; sets left far short mostly do not. More is not automatically better, volume you cannot recover from is volume that does nothing. If performance is dropping week to week, the problem is usually total volume rather than intensity.`),
  D('rep-ranges', 'Why rep ranges differ between exercises', 'programming',
    `Rep range follows the job the exercise is doing. Heavy compound movements early in a session sit low, around three to six reps, because that is where you can express force with a technique you can still control. Accessory and isolation work sits higher, eight to fifteen, because the goal there is accumulated tension on a muscle rather than a maximal effort, and because loading a small muscle heavily is a poor risk trade. Within a session the first two movements usually carry the lowest reps and the highest intent; everything after them is volume. The ranges are not magic numbers. They are a way of matching effort to what the movement is good at.`),
  D('deload', 'Deloads and when to take one', 'recovery',
    `A deload is a planned reduction in training stress, usually a week at roughly half the normal volume or a meaningful drop in intensity. Take one when performance stalls across several sessions, when joints ache more than muscles, when sleep or appetite degrade, or simply every fourth to sixth week as insurance. A deload is not lost time, the adaptation happens during recovery, not during the session.`),
  D('readiness', 'Training around readiness', 'recovery',
    `Readiness scores, resting heart rate and HRV describe how well recovered you are on a given morning. They are directional, not precise. A single poor reading is noise; three in a row is a signal. The practical response is to keep the session structure and reduce the load, same movements, same sets, less weight, stopping further from failure. Skipping entirely is rarely the right answer and breaks the habit.`),
  D('injury', 'Training with pain or injury', 'safety',
    `Pain during a movement is information, not something to push through. Sharp, localised or joint-centred pain means stop that movement. Training around an injury is possible and usually preferable to stopping altogether, but which substitutions are appropriate depends on the diagnosis, and that requires a professional who can examine you. No program written from a questionnaire, and no software. Can safely make that call.`),
  D('sleep', 'Sleep and training', 'recovery',
    `Sleep is the single largest recovery variable and the one most often ignored in favour of supplements. Under seven hours, strength performance and appetite regulation both measurably degrade. If you are choosing between an extra early session and an extra hour of sleep, the sleep usually wins.`),
  D('protein', 'Protein for strength training', 'nutrition',
    `Roughly 1.6 to 2.2 grams of protein per kilogram of bodyweight per day supports muscle gain, and the total across the day matters far more than the timing of any single meal. Beyond that range the additional benefit is very small. This is general guidance and not personalised nutrition advice.`),
  D('home-gym-space', 'Working with a low ceiling', 'equipment',
    `Ceiling height limits a home gym more often than floor space does. Standing overhead pressing needs your standing reach plus the bar plus a few inches. Pull-ups need clearance above the bar for your head. If the ceiling is under about seven and a half feet, a squat stand or a half rack usually fits where a full four-post rack will not, and landmine pressing substitutes for overhead work. Measure to the finished ceiling, not to a joist or a duct.`),
  D('minimum-equipment', 'The smallest useful home gym', 'equipment',
    `A rack, a barbell, a set of plates and an adjustable bench cover every fundamental pattern and will serve for years. Add a pull-up bar, usually part of the rack, and the vertical pull is handled. Everything after that is refinement: dumbbells for unilateral work, a cable tower for pulldowns and triceps, kettlebells for conditioning. Buy the rack once and buy it well; it is the piece you build everything else around.`),
  D('form-check', 'Getting a form check', 'safety',
    `Film from the side and from a front three-quarter angle, one full working set, with the whole body and the bar in frame. Say what weight and what it felt like. A single rep from a bad angle is not enough to say anything useful about. When form and pain are both involved, a person who can watch you move in real time beats any amount of video review.`),
];
