import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  console.log('Creating tables...');

  await pool.query(`
    DROP TABLE IF EXISTS ai_analyses CASCADE;
    DROP TABLE IF EXISTS dream_insights CASCADE;
    DROP TABLE IF EXISTS sleep_goals CASCADE;
    DROP TABLE IF EXISTS dream_tags CASCADE;
    DROP TABLE IF EXISTS recurring_dreams CASCADE;
    DROP TABLE IF EXISTS lucid_dreams CASCADE;
    DROP TABLE IF EXISTS sleep_quality CASCADE;
    DROP TABLE IF EXISTS mood_entries CASCADE;
    DROP TABLE IF EXISTS dream_categories CASCADE;
    DROP TABLE IF EXISTS dream_symbols CASCADE;
    DROP TABLE IF EXISTS dream_entries CASCADE;
    DROP TABLE IF EXISTS users CASCADE;

    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE dream_entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      dream_date DATE NOT NULL,
      mood VARCHAR(50),
      sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
      is_lucid BOOLEAN DEFAULT false,
      category VARCHAR(100),
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE dream_symbols (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      meaning TEXT NOT NULL,
      category VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE dream_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      color VARCHAR(7) DEFAULT '#6366f1',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE mood_entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      mood VARCHAR(50) NOT NULL,
      intensity INTEGER CHECK (intensity >= 1 AND intensity <= 10),
      entry_date DATE NOT NULL,
      notes TEXT,
      triggers VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE sleep_quality (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      sleep_date DATE NOT NULL,
      hours_slept NUMERIC(3,1),
      quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 10),
      bedtime TIME,
      wake_time TIME,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE lucid_dreams (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      dream_date DATE NOT NULL,
      technique_used VARCHAR(100),
      lucidity_level INTEGER CHECK (lucidity_level >= 1 AND lucidity_level <= 10),
      duration_minutes INTEGER,
      control_level INTEGER CHECK (control_level >= 1 AND control_level <= 10),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE recurring_dreams (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      frequency VARCHAR(50),
      first_occurrence DATE,
      last_occurrence DATE,
      occurrence_count INTEGER DEFAULT 1,
      common_elements TEXT,
      emotional_tone VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE dream_tags (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      color VARCHAR(7) DEFAULT '#8b5cf6',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE sleep_goals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      target_date DATE,
      goal_type VARCHAR(50),
      target_value NUMERIC(10,1),
      current_value NUMERIC(10,1) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE dream_insights (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      insight_type VARCHAR(50),
      related_dreams INTEGER[] DEFAULT '{}',
      significance VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE ai_analyses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      dream_content TEXT,
      analysis_type VARCHAR(50),
      result TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('Tables created. Seeding data...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo1234', 10);
  await pool.query(
    "INSERT INTO users (email, password, name) VALUES ('demo@dreamjournal.com', $1, 'Dream Explorer')",
    [hashedPassword]
  );
  const userId = 1;

  // Seed Dream Entries (15 items)
  const dreams = [
    ["Flying Over Mountains", "I was soaring above snow-capped mountains, feeling incredibly free. The wind was warm and I could see entire civilizations below. A golden eagle flew beside me and spoke words of wisdom.", "2026-03-14", "Joyful", 8, false, "Adventure", "{flying,freedom,nature}"],
    ["The Underwater City", "I discovered a magnificent city beneath the ocean. Crystal buildings glowed with bioluminescent light. Merpeople welcomed me and showed me ancient libraries filled with knowledge.", "2026-03-13", "Amazed", 7, false, "Fantasy", "{water,city,discovery}"],
    ["Lost in a Maze", "I was wandering through an ever-changing maze made of hedges. Every time I thought I found the exit, the walls shifted. A small fox appeared and tried to guide me.", "2026-03-12", "Anxious", 5, false, "Anxiety", "{maze,lost,animals}"],
    ["The Time Machine", "I found an old clock that transported me to different eras. I visited ancient Rome, medieval England, and a futuristic space station. Each place had a message for me.", "2026-03-11", "Curious", 9, false, "Adventure", "{time,travel,history}"],
    ["Childhood Home", "I returned to my childhood home but everything was slightly different. The rooms were larger, colors more vivid. My grandmother was there, cooking her famous soup.", "2026-03-10", "Nostalgic", 6, false, "Memory", "{home,family,past}"],
    ["The Storm", "A massive thunderstorm was approaching. I stood on a cliff watching it come. Lightning struck around me but I felt no fear, only power and connection to nature.", "2026-03-09", "Empowered", 7, false, "Nature", "{storm,power,nature}"],
    ["Exam I Never Studied For", "I was back in school, sitting for a final exam in a subject I never attended. The questions were in a language I couldn't read. Everyone else was writing confidently.", "2026-03-08", "Stressed", 4, false, "Anxiety", "{school,exam,stress}"],
    ["Garden of Crystals", "I walked through a garden where all the plants were made of crystals. Each one hummed a different note. When I touched them, I could feel their energy flowing into me.", "2026-03-07", "Peaceful", 8, true, "Fantasy", "{crystals,garden,energy}"],
    ["The Chase", "Something was chasing me through dark city streets. I couldn't see what it was but I could hear its footsteps. I ducked into an alley and found a door to safety.", "2026-03-06", "Fearful", 3, false, "Nightmare", "{chase,city,fear}"],
    ["Talking Animals Council", "I attended a council meeting of talking animals in a forest clearing. An owl presided over the meeting. They were discussing the balance of nature and asked for my input.", "2026-03-05", "Amused", 7, false, "Fantasy", "{animals,forest,wisdom}"],
    ["Falling Into Space", "I was falling through space, past planets and stars. Instead of fear, I felt immense peace. Each planet I passed showed me a different possible future.", "2026-03-04", "Serene", 6, false, "Cosmic", "{space,falling,future}"],
    ["The Library of Dreams", "I found a library where each book contained someone's dream. I could enter any dream by opening its book. I chose one about a sunrise over the ocean.", "2026-03-03", "Fascinated", 9, true, "Fantasy", "{library,books,dreams}"],
    ["Running Marathon", "I was running an endless marathon. The road kept stretching but I never got tired. Other runners were people from different points in my life cheering me on.", "2026-03-02", "Determined", 5, false, "Challenge", "{running,endurance,life}"],
    ["The Mirror World", "I stepped through a mirror into a world where everything was reversed. My reflection was alive and showed me things about myself I had never noticed.", "2026-03-01", "Introspective", 7, false, "Psychological", "{mirror,reflection,self}"],
    ["Peaceful Beach", "I was sitting on a pristine beach at sunset. The waves were perfectly rhythmic and calming. Dolphins played in the distance and the sky turned every shade of gold.", "2026-02-28", "Relaxed", 10, false, "Nature", "{beach,ocean,peace}"],
    ["The Haunted Castle", "I explored an ancient castle with secret passages. Ghosts appeared but they were friendly, sharing stories of their lives. One ghost gave me a golden key.", "2026-02-27", "Adventurous", 6, false, "Adventure", "{castle,ghosts,mystery}"]
  ];

  for (const d of dreams) {
    await pool.query(
      `INSERT INTO dream_entries (user_id, title, content, dream_date, mood, sleep_quality, is_lucid, category, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, ...d]
    );
  }

  // Seed Dream Symbols (15 items)
  const symbols = [
    ["Water", "Represents emotions, the unconscious mind, and purification. Calm water suggests peace; turbulent water suggests emotional turmoil.", "Elements"],
    ["Flying", "Symbolizes freedom, ambition, and rising above problems. Can also represent desire to escape from limitations.", "Actions"],
    ["Teeth Falling", "Often represents anxiety about appearance, fear of aging, or concerns about powerlessness in a situation.", "Body"],
    ["Snake", "Represents transformation, hidden fears, or healing. Can also symbolize wisdom or temptation depending on context.", "Animals"],
    ["House", "Symbolizes the self or psyche. Different rooms represent different aspects of personality or life areas.", "Structures"],
    ["Fire", "Represents passion, transformation, anger, or purification. Can indicate creative energy or destructive forces.", "Elements"],
    ["Mirror", "Symbolizes self-reflection, truth, and how you perceive yourself. A broken mirror may suggest a fractured self-image.", "Objects"],
    ["Forest", "Represents the unknown, growth, and the unconscious mind. Getting lost in a forest suggests confusion or exploration.", "Nature"],
    ["Bridge", "Symbolizes transitions, connections, and overcoming obstacles. Crossing a bridge represents moving to a new phase.", "Structures"],
    ["Moon", "Represents intuition, femininity, cycles, and hidden aspects of self. Different phases carry different meanings.", "Celestial"],
    ["Dog", "Symbolizes loyalty, protection, and friendship. An aggressive dog may represent a threatening relationship.", "Animals"],
    ["Ocean", "Represents the vast unconscious, emotional depth, and the unknown. Diving deep suggests exploring hidden feelings.", "Nature"],
    ["Key", "Symbolizes access, secrets, solutions, and opportunities. Finding a key suggests discovering a solution to a problem.", "Objects"],
    ["Mountain", "Represents goals, challenges, and spiritual elevation. Climbing suggests ambition; reaching the top means achievement.", "Nature"],
    ["Bird", "Symbolizes freedom, perspective, spiritual messages, and aspirations. Different birds carry specific meanings.", "Animals"],
    ["Clock", "Represents time anxiety, mortality, and life transitions. A stopped clock may suggest feeling stuck.", "Objects"]
  ];

  for (const s of symbols) {
    await pool.query('INSERT INTO dream_symbols (name, meaning, category) VALUES ($1, $2, $3)', s);
  }

  // Seed Dream Categories (15 items)
  const categories = [
    ["Adventure", "Dreams involving quests, exploration, and exciting journeys", "#f59e0b"],
    ["Nightmare", "Frightening or disturbing dreams that may wake you up", "#ef4444"],
    ["Fantasy", "Dreams with magical or supernatural elements", "#8b5cf6"],
    ["Anxiety", "Dreams reflecting stress, worry, or fear about real-life situations", "#f97316"],
    ["Nature", "Dreams set in natural environments or featuring natural phenomena", "#22c55e"],
    ["Memory", "Dreams that revisit past experiences or places from your life", "#06b6d4"],
    ["Psychological", "Dreams with strong psychological or self-reflective themes", "#ec4899"],
    ["Cosmic", "Dreams involving space, stars, planets, or universal themes", "#3b82f6"],
    ["Challenge", "Dreams about overcoming obstacles or facing tests", "#eab308"],
    ["Romantic", "Dreams involving love, relationships, or emotional connections", "#e11d48"],
    ["Prophetic", "Dreams that seem to predict or foreshadow future events", "#7c3aed"],
    ["Healing", "Dreams that feel therapeutic or emotionally restorative", "#14b8a6"],
    ["Creative", "Dreams that inspire artistic ideas or creative solutions", "#f472b6"],
    ["Spiritual", "Dreams with religious, spiritual, or transcendent themes", "#a855f7"],
    ["Recurring", "Dreams that repeat with similar themes or scenarios", "#64748b"]
  ];

  for (const c of categories) {
    await pool.query('INSERT INTO dream_categories (name, description, color) VALUES ($1, $2, $3)', c);
  }

  // Seed Mood Entries (15 items)
  const moods = [
    ["Happy", 8, "2026-03-14", "Had a great morning after vivid dreams", "Good sleep"],
    ["Anxious", 6, "2026-03-13", "Woke up with residual anxiety from dream", "Work stress"],
    ["Peaceful", 9, "2026-03-12", "Meditation before bed helped tremendously", "Meditation"],
    ["Curious", 7, "2026-03-11", "Dreams sparked interesting questions about life", "Dream recall"],
    ["Melancholic", 5, "2026-03-10", "Dreams about childhood brought up old emotions", "Nostalgia"],
    ["Energized", 8, "2026-03-09", "Woke up feeling powerful after storm dream", "Good sleep"],
    ["Stressed", 7, "2026-03-08", "Exam dream reflected real work pressure", "Deadline"],
    ["Serene", 9, "2026-03-07", "Crystal garden dream left lasting peace", "Nature walk"],
    ["Frightened", 4, "2026-03-06", "Chase dream was intense and unsettling", "Late coffee"],
    ["Amused", 7, "2026-03-05", "Animal council dream was delightfully absurd", "Comedy show"],
    ["Contemplative", 6, "2026-03-04", "Space dream made me think about big questions", "Reading"],
    ["Inspired", 9, "2026-03-03", "Library dream gave me creative ideas", "Journaling"],
    ["Determined", 8, "2026-03-02", "Marathon dream motivated me for the day", "Exercise"],
    ["Reflective", 7, "2026-03-01", "Mirror dream prompted deep self-reflection", "Therapy session"],
    ["Calm", 10, "2026-02-28", "Beach dream was the most relaxing experience", "Vacation day"],
    ["Excited", 8, "2026-02-27", "Castle dream adventure was thrilling", "New project"]
  ];

  for (const m of moods) {
    await pool.query(
      'INSERT INTO mood_entries (user_id, mood, intensity, entry_date, notes, triggers) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, ...m]
    );
  }

  // Seed Sleep Quality (15 items)
  const sleepEntries = [
    ["2026-03-14", 7.5, 8, "22:30", "06:00", "Slept well, vivid dreams"],
    ["2026-03-13", 6.0, 5, "23:45", "05:45", "Restless night, woke up twice"],
    ["2026-03-12", 8.0, 9, "22:00", "06:00", "Deep restful sleep"],
    ["2026-03-11", 7.0, 7, "23:00", "06:00", "Good sleep with dream recall"],
    ["2026-03-10", 5.5, 4, "00:30", "06:00", "Went to bed too late"],
    ["2026-03-09", 8.5, 9, "21:30", "06:00", "Excellent sleep, early bedtime"],
    ["2026-03-08", 6.5, 5, "23:30", "06:00", "Stress affected sleep quality"],
    ["2026-03-07", 7.5, 8, "22:15", "05:45", "Peaceful sleep with lucid dream"],
    ["2026-03-06", 5.0, 3, "01:00", "06:00", "Nightmare disrupted sleep"],
    ["2026-03-05", 7.0, 7, "22:30", "05:30", "Consistent sleep schedule paying off"],
    ["2026-03-04", 6.0, 6, "23:00", "05:00", "Early wake up, moderate quality"],
    ["2026-03-03", 8.0, 9, "21:45", "05:45", "Best sleep of the week"],
    ["2026-03-02", 7.0, 7, "22:30", "05:30", "Steady improvement"],
    ["2026-03-01", 6.5, 6, "23:15", "05:45", "Average night, some tossing"],
    ["2026-02-28", 9.0, 10, "21:00", "06:00", "Perfect sleep, vacation mode"],
    ["2026-02-27", 7.0, 7, "22:00", "05:00", "Good quality, early rise"]
  ];

  for (const s of sleepEntries) {
    await pool.query(
      'INSERT INTO sleep_quality (user_id, sleep_date, hours_slept, quality_rating, bedtime, wake_time, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, ...s]
    );
  }

  // Seed Lucid Dreams (15 items)
  const lucidDreams = [
    ["Crystal Garden Exploration", "Realized I was dreaming when I noticed crystals growing. Took control and flew between the crystal trees, composing music by touching each one.", "2026-03-07", "Reality Check", 8, 25, 7],
    ["Dream Library Visit", "Became lucid when I noticed impossible architecture. Explored the library, choosing specific books and entering different dream worlds at will.", "2026-03-03", "WILD", 9, 35, 9],
    ["Ocean Floor Walk", "Noticed I could breathe underwater. Started exploring the ocean floor, summoning sea creatures and building sandcastles with my mind.", "2026-02-25", "MILD", 7, 20, 6],
    ["Sky Painting", "Became lucid and decided to paint the sky. Used hand gestures to create auroras and color patterns across the entire horizon.", "2026-02-20", "Reality Check", 8, 30, 8],
    ["Conversation with Self", "Met my dream self in a mirror. Had a profound conversation about fears and aspirations. The mirror self gave advice I still remember.", "2026-02-15", "DILD", 6, 15, 5],
    ["Flying City Builder", "Gained lucidity while flying. Started constructing buildings in the air using thought alone. Created an entire floating city.", "2026-02-10", "WILD", 9, 40, 9],
    ["Time Manipulation", "Realized I was dreaming and experimented with slowing down and speeding up time. Watched a flower bloom in slow motion.", "2026-02-05", "MILD", 7, 20, 7],
    ["Teleportation Practice", "Achieved lucidity and practiced teleporting to different locations. Visited Paris, Tokyo, and the Moon in one dream.", "2026-01-30", "Reality Check", 8, 25, 8],
    ["Dream Music Concert", "Became lucid at a concert. Started conducting the orchestra with my hands, creating entirely new symphonies.", "2026-01-25", "DILD", 6, 15, 5],
    ["Shapeshifting", "Gained awareness and transformed into different animals. Experienced flying as an eagle, swimming as a dolphin, running as a cheetah.", "2026-01-20", "MILD", 7, 30, 7],
    ["Gravity Control", "Noticed gravity was wrong and became lucid. Spent the dream adjusting gravity in different areas, creating zero-G zones.", "2026-01-15", "Reality Check", 8, 20, 8],
    ["Dream Healing", "Achieved lucidity during a nightmare. Transformed the scary elements into healing light and felt genuine emotional release.", "2026-01-10", "DILD", 9, 25, 6],
    ["Mathematical Visualization", "Became lucid and visualized complex mathematical concepts as 3D structures. Understood things I couldn't grasp while awake.", "2026-01-05", "WILD", 7, 35, 7],
    ["Garden Creation", "Gained lucidity in a barren landscape. Created a lush garden from scratch, placing each plant and watching it grow instantly.", "2025-12-30", "MILD", 8, 30, 8],
    ["Elemental Control", "Realized I was dreaming and practiced controlling the four elements. Created fire tornadoes, water sculptures, and earth formations.", "2025-12-25", "Reality Check", 9, 40, 9]
  ];

  for (const l of lucidDreams) {
    await pool.query(
      `INSERT INTO lucid_dreams (user_id, title, content, dream_date, technique_used, lucidity_level, duration_minutes, control_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, ...l]
    );
  }

  // Seed Recurring Dreams (15 items)
  const recurringDreams = [
    ["The Endless Staircase", "Walking up stairs that never end, each floor has a different scene from my life", "Weekly", "2025-06-15", "2026-03-10", 28, "Stairs, doors, changing rooms, exhaustion", "Determined"],
    ["Late for Important Event", "Always running late for something crucial but obstacles keep appearing", "Bi-weekly", "2025-08-01", "2026-03-08", 15, "Clocks, running, obstacles, panic", "Anxious"],
    ["Teeth Crumbling", "My teeth start falling out or crumbling during conversations", "Monthly", "2025-03-20", "2026-02-28", 12, "Teeth, mirror, social situations", "Embarrassed"],
    ["The Flooded House", "My childhood home slowly fills with water from an unknown source", "Bi-weekly", "2025-07-10", "2026-03-05", 16, "Water, house, rising levels, escape", "Worried"],
    ["Flying Then Falling", "Start with joyful flight but gradually lose altitude and plummet", "Weekly", "2025-05-01", "2026-03-12", 35, "Sky, falling, wind, landing", "Thrilled then scared"],
    ["The Forgotten Class", "Discover I've been enrolled in a class all semester but never attended", "Monthly", "2025-09-01", "2026-03-01", 7, "School, exam, empty desk, teacher", "Panicked"],
    ["Lost in Familiar City", "Walking in a city I know but streets keep changing and I can't find my way", "Bi-weekly", "2025-04-15", "2026-03-06", 20, "Streets, signs, wrong turns, map", "Confused"],
    ["The Endless Tunnel", "Driving through a tunnel that keeps going, sometimes getting narrower", "Monthly", "2025-10-01", "2026-02-20", 5, "Car, darkness, light ahead, narrowing", "Claustrophobic"],
    ["Speaking Foreign Language", "I'm fluently speaking a language I don't know, impressing everyone", "Bi-weekly", "2025-11-15", "2026-03-11", 9, "Conversation, surprise, words flowing", "Confident"],
    ["The Unopenable Door", "Finding a beautiful door that I desperately want to open but can't", "Weekly", "2025-07-01", "2026-03-13", 30, "Door, key, lock, frustration", "Frustrated"],
    ["Childhood Playground", "Revisiting my old playground but I'm my current age among children", "Monthly", "2025-08-20", "2026-02-25", 8, "Swings, slides, children, sun", "Nostalgic"],
    ["The Wave", "Standing on a beach as a massive wave approaches, never reaching me", "Bi-weekly", "2025-06-01", "2026-03-09", 18, "Ocean, wave, standing still, anticipation", "Awestruck"],
    ["Missing Train", "Running to catch a train but always arriving just as it departs", "Weekly", "2025-09-15", "2026-03-14", 22, "Train station, running, departing train", "Frustrated"],
    ["The Garden Maze", "Wandering through a beautiful but complex garden maze seeking the center", "Monthly", "2025-12-01", "2026-03-07", 4, "Hedges, flowers, paths, center goal", "Peaceful"],
    ["Invisible in Crowd", "Being in a crowd but no one can see or hear me", "Bi-weekly", "2025-10-15", "2026-03-04", 11, "Crowd, shouting, invisible, isolation", "Lonely"]
  ];

  for (const r of recurringDreams) {
    await pool.query(
      `INSERT INTO recurring_dreams (user_id, title, description, frequency, first_occurrence, last_occurrence, occurrence_count, common_elements, emotional_tone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, ...r]
    );
  }

  // Seed Dream Tags (15 items)
  const tags = [
    ["flying", "#3b82f6"],
    ["water", "#06b6d4"],
    ["animals", "#22c55e"],
    ["family", "#f59e0b"],
    ["chase", "#ef4444"],
    ["nature", "#10b981"],
    ["school", "#8b5cf6"],
    ["travel", "#ec4899"],
    ["fear", "#dc2626"],
    ["freedom", "#0ea5e9"],
    ["mystery", "#7c3aed"],
    ["love", "#e11d48"],
    ["discovery", "#f97316"],
    ["transformation", "#a855f7"],
    ["peace", "#14b8a6"],
    ["power", "#eab308"]
  ];

  for (const t of tags) {
    await pool.query('INSERT INTO dream_tags (name, color) VALUES ($1, $2)', t);
  }

  // Seed Sleep Goals (15 items)
  const goals = [
    ["Sleep 8 Hours Nightly", "Consistently get 8 hours of quality sleep each night", "2026-04-15", "duration", 8.0, 7.2, "active"],
    ["Improve Sleep Quality", "Achieve average sleep quality rating of 8+", "2026-04-01", "quality", 8.0, 7.0, "active"],
    ["Earlier Bedtime", "Go to bed by 22:00 every night", "2026-03-31", "schedule", 22.0, 22.5, "active"],
    ["Weekly Lucid Dream", "Have at least one lucid dream per week", "2026-06-01", "lucid", 4.0, 2.0, "active"],
    ["Dream Journal Streak", "Record dreams every morning for 30 days straight", "2026-04-14", "consistency", 30.0, 16.0, "active"],
    ["Reduce Screen Time", "Stop screens 1 hour before bed", "2026-03-20", "habit", 7.0, 4.0, "active"],
    ["Meditation Practice", "Meditate 10 minutes before bed every night", "2026-04-30", "habit", 30.0, 12.0, "active"],
    ["No Caffeine After 2PM", "Eliminate caffeine consumption after 2 PM", "2026-03-25", "habit", 14.0, 8.0, "active"],
    ["Dream Recall Improvement", "Remember at least 2 dreams per night", "2026-05-01", "recall", 2.0, 1.3, "active"],
    ["Consistent Wake Time", "Wake up at 6:00 AM every day including weekends", "2026-04-15", "schedule", 7.0, 5.0, "active"],
    ["Read Before Sleep", "Read for 30 minutes before bed instead of phone", "2026-03-30", "habit", 21.0, 10.0, "active"],
    ["Sleep Environment", "Optimize bedroom temperature, darkness, and noise", "2026-03-20", "environment", 5.0, 3.0, "active"],
    ["Reduce Nightmares", "Use techniques to reduce nightmare frequency", "2026-05-15", "quality", 1.0, 3.0, "active"],
    ["Exercise Regularly", "Exercise at least 30 min daily for better sleep", "2026-04-30", "habit", 30.0, 18.0, "active"],
    ["Weekend Sleep Consistency", "Keep weekend sleep schedule within 1hr of weekday", "2026-04-01", "schedule", 1.0, 2.5, "active"]
  ];

  for (const g of goals) {
    await pool.query(
      `INSERT INTO sleep_goals (user_id, title, description, target_date, goal_type, target_value, current_value, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, ...g]
    );
  }

  // Seed Dream Insights (15 items)
  const insights = [
    ["Water Dreams and Emotions", "Your water-related dreams tend to appear during emotionally turbulent periods. The state of water mirrors your emotional state.", "emotional", "{1,2}", "high"],
    ["Flight Pattern Connection", "Dreams of flying consistently follow days with high productivity and positive mood. Flying represents your sense of achievement.", "behavioral", "{1,5}", "high"],
    ["Recurring Chase Resolution", "Your chase dreams have been decreasing in frequency, suggesting you're facing your anxieties more effectively in waking life.", "progress", "{9}", "medium"],
    ["Animal Guides", "Animals in your dreams often serve as guides or messengers. Pay attention to which animals appear - they reflect qualities you need.", "symbolic", "{10}", "high"],
    ["Nostalgia Trigger Pattern", "Dreams about your childhood home spike after family phone calls or viewing old photos. These are processing memories.", "trigger", "{5}", "medium"],
    ["Lucid Dream Improvement", "Your lucid dreaming frequency has increased 40% since starting reality checks. Control level also shows steady improvement.", "progress", "{}", "high"],
    ["Sleep Quality Correlation", "Dreams are most vivid and memorable when sleep quality is rated 7+. Poor sleep leads to fragmented, hard-to-recall dreams.", "correlation", "{}", "high"],
    ["Stress Dream Indicators", "Exam and chase dreams cluster around work deadlines. Consider stress management techniques during high-pressure periods.", "behavioral", "{7,9}", "medium"],
    ["Creative Dream Mining", "Your fantasy and adventure dreams contain highly creative elements. Consider journaling these for creative projects.", "creative", "{2,4}", "medium"],
    ["Emotional Processing", "Dreams about storms and natural forces tend to precede emotional breakthroughs. Your psyche uses these to process big feelings.", "emotional", "{6}", "high"],
    ["Mirror/Self-Reflection", "Mirror dreams appear monthly and seem to coincide with therapy sessions. They represent active self-examination.", "psychological", "{14}", "high"],
    ["Nature as Healing", "Beach and nature dreams consistently produce the highest mood ratings the next day. Consider more nature exposure.", "wellness", "{15}", "medium"],
    ["Symbol Evolution", "The key symbol has appeared in 3 dreams, each time getting closer to being used. This suggests approaching a breakthrough.", "symbolic", "{16}", "high"],
    ["Social Dream Patterns", "Dreams with other people are more frequent on weekends, possibly reflecting social needs unmet during the workweek.", "social", "{}", "medium"],
    ["Nightmare Frequency Decline", "Nightmares have decreased from 3/month to 1/month over the past quarter. Your sleep hygiene improvements are working.", "progress", "{}", "high"]
  ];

  for (const i of insights) {
    await pool.query(
      `INSERT INTO dream_insights (user_id, title, content, insight_type, related_dreams, significance)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, ...i]
    );
  }

  console.log('Seed data inserted successfully!');
  await pool.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
