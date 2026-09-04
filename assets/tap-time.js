/* It's Tap Time — shared helpers: sound, haptics, saved scores, streaks, sharing.
   Loaded by the homepage and every game. Fails silently wherever a browser
   doesn't support a feature (audio, vibration, share, storage). */
(function(){
  let audioCtx = null;
  function ensureAudio(){
    try{
      if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }catch(e){ return null; }
  }

  function tone(freq, dur, type, vol, delay){
    const c = ensureAudio();
    if (!c) return;
    try{
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      const t0 = c.currentTime + (delay||0);
      gain.gain.setValueAtTime(vol!=null?vol:0.16, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    }catch(e){}
  }

  const sfx = {
    tap(){ tone(520, 0.055, 'sine', 0.12); },
    success(){ tone(660, 0.09, 'sine', 0.15); tone(880, 0.12, 'sine', 0.13, 0.07); },
    fail(){ tone(150, 0.3, 'sawtooth', 0.16); },
    unlock(){ ensureAudio(); }
  };

  function vibrate(pattern){
    try{ if (navigator.vibrate) navigator.vibrate(pattern); }catch(e){}
  }
  const haptics = {
    tap(){ vibrate(8); },
    success(){ vibrate([10,25,10]); },
    fail(){ vibrate(35); }
  };

  function storageGet(key){
    try{ return localStorage.getItem(key); }catch(e){ return null; }
  }
  function storageSet(key, val){
    try{ localStorage.setItem(key, val); }catch(e){}
  }

  function getBest(gameKey){
    return parseInt(storageGet('tt_best_'+gameKey) || '0', 10) || 0;
  }
  function setBestIfHigher(gameKey, score){
    const cur = getBest(gameKey);
    if (score > cur){
      storageSet('tt_best_'+gameKey, String(score));
      return { isNew: true, value: score };
    }
    return { isNew: false, value: cur };
  }

  function todayStr(){
    const d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function getStreak(){
    return parseInt(storageGet('tt_streak') || '0', 10) || 0;
  }
  function recordPlay(){
    const today = todayStr();
    const last = storageGet('tt_last_play');
    let streak = getStreak();
    if (last === today){
      // already counted today
    } else if (last){
      const diffDays = Math.round((new Date(today+'T00:00:00') - new Date(last+'T00:00:00')) / 86400000);
      streak = (diffDays === 1) ? streak+1 : 1;
    } else {
      streak = 1;
    }
    storageSet('tt_last_play', today);
    storageSet('tt_streak', String(streak));
    return streak;
  }

  function getChallenge(){
    try{
      const params = new URLSearchParams(location.search);
      const raw = params.get('beat');
      const n = raw != null ? parseInt(raw, 10) : NaN;
      return (Number.isFinite(n) && n >= 0) ? n : null;
    }catch(e){ return null; }
  }

  function share(gameName, score){
    let url;
    try{
      const u = new URL(location.href);
      u.searchParams.set('beat', String(score));
      url = u.toString();
    }catch(e){ url = location.href; }
    const text = `I got ${score} on ${gameName} on It's Tap Time \u2014 think you can beat it?`;
    if (navigator.share){
      navigator.share({ title: "It's Tap Time", text, url }).catch(()=>{});
      return 'native';
    } else if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text+' '+url).catch(()=>{});
      return 'clipboard';
    }
    return 'none';
  }

  window.TapTime = { sfx, haptics, getBest, setBestIfHigher, getStreak, recordPlay, share, getChallenge };
})();
