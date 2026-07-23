/* Pausentamagotchi - Backup-Format, Pruefsumme, Sichern & Laden */
const BACKUP_KEYS = [
    'tama_save_v6',                          // das Tamagotchi selbst
    'tama_tcoins', 'tama_tickets',           // Waehrungen
    'tama_acc_level', 'tama_acc_xp',         // Pfleger-Level
    'tama_medals', 'tama_lifetime',          // Medaillen + Lebenswerk-Statistik
    'tama_inventory', 'tama_buff_expiries',  // Inventar & Buffs
    'tama_village', 'tama_arena', 'tama_legacy',
    'tama_quests', 'tama_pokedex',
    'tama_graveyard_v6', 'tama_leaderboard_v6', 'tama_graves_care',
    'tama_arcade_hi', 'tama_pomodoro',
    'tama_story_seen', 'tama_notif_seen',
    'tama_muted', 'tama_last_backup', 'tama_lang',
    'tama_steps', 'tama_steps_on'
];
// ================================================================
// === SPRACHE / LANGUAGE =========================================
// ================================================================
// Die deutschen Texte bleiben die Quelle. t() schlaegt bei Englisch
// die Uebersetzung nach - so mussten die Datentabellen nicht umgebaut
// werden, nur die Stellen, an denen sie angezeigt werden.
