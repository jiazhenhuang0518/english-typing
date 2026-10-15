// 入门课内容：字母 + 生活常用句（全部手工编写，零基础友好）

// [字母, 字母名读音, 常见发音, 例词, 例词中文, 图标]
export const LETTERS = [
  ["A", "/eɪ/", "/æ/", "apple", "苹果", "🍎"],
  ["B", "/biː/", "/b/", "bag", "包", "👜"],
  ["C", "/siː/", "/k/", "cat", "猫", "🐱"],
  ["D", "/diː/", "/d/", "dog", "狗", "🐶"],
  ["E", "/iː/", "/e/", "egg", "鸡蛋", "🥚"],
  ["F", "/ef/", "/f/", "fish", "鱼", "🐟"],
  ["G", "/dʒiː/", "/g/", "girl", "女孩", "👧"],
  ["H", "/eɪtʃ/", "/h/", "hat", "帽子", "🎩"],
  ["I", "/aɪ/", "/ɪ/", "ink", "墨水", "🖋️"],
  ["J", "/dʒeɪ/", "/dʒ/", "juice", "果汁", "🧃"],
  ["K", "/keɪ/", "/k/", "key", "钥匙", "🔑"],
  ["L", "/el/", "/l/", "leg", "腿", "🦵"],
  ["M", "/em/", "/m/", "milk", "牛奶", "🥛"],
  ["N", "/en/", "/n/", "nose", "鼻子", "👃"],
  ["O", "/əʊ/", "/ɒ/", "orange", "橙子", "🍊"],
  ["P", "/piː/", "/p/", "pen", "笔", "🖊️"],
  ["Q", "/kjuː/", "/kw/", "queen", "女王", "👑"],
  ["R", "/ɑː/", "/r/", "red", "红色", "🔴"],
  ["S", "/es/", "/s/", "sun", "太阳", "☀️"],
  ["T", "/tiː/", "/t/", "tea", "茶", "🍵"],
  ["U", "/juː/", "/ʌ/", "umbrella", "雨伞", "☂️"],
  ["V", "/viː/", "/v/", "van", "面包车", "🚐"],
  ["W", "/ˈdʌbljuː/", "/w/", "water", "水", "💧"],
  ["X", "/eks/", "/ks/", "box", "盒子", "📦"],
  ["Y", "/waɪ/", "/j/", "yes", "是的", "✅"],
  ["Z", "/zed/", "/z/", "zoo", "动物园", "🦁"],
];

export const SCENES = [
  {
    id: "greet", icon: "👋", title: "打招呼", lines: [
      ["你好！", "Hello!"],
      ["早上好！", "Good morning!"],
      ["你好吗？", "How are you?"],
      ["我很好，谢谢。", "I'm fine, thank you."],
      ["很高兴认识你。", "Nice to meet you."],
      ["谢谢你！", "Thank you!"],
      ["不客气。", "You're welcome."],
      ["对不起。", "I'm sorry."],
      ["再见！", "Goodbye!"],
      ["明天见。", "See you tomorrow."],
    ],
  },
  {
    id: "me", icon: "🙋", title: "自我介绍", lines: [
      ["我叫家振。", "My name is Jiazhen."],
      ["我来自中国。", "I'm from China."],
      ["我是一名教练。", "I'm a coach."],
      ["我喜欢运动。", "I like sports."],
      ["我在学英语。", "I'm learning English."],
      ["我的英语不太好。", "My English is not very good."],
      ["请说慢一点。", "Please speak slowly."],
      ["你能再说一遍吗？", "Can you say that again?"],
      ["我听不懂。", "I don't understand."],
    ],
  },
  {
    id: "food", icon: "🍜", title: "吃饭点餐", lines: [
      ["我饿了。", "I'm hungry."],
      ["我想要一杯咖啡。", "I'd like a cup of coffee."],
      ["可以看一下菜单吗？", "Can I see the menu, please?"],
      ["我要这个。", "I'll have this."],
      ["不要辣。", "Not spicy, please."],
      ["我想喝点水。", "I'd like some water."],
      ["很好吃！", "It's delicious!"],
      ["请买单。", "The bill, please."],
    ],
  },
  {
    id: "shop", icon: "🛍️", title: "购物", lines: [
      ["这个多少钱？", "How much is this?"],
      ["我只是看看。", "I'm just looking."],
      ["有大一点的吗？", "Do you have a bigger one?"],
      ["我可以试穿吗？", "Can I try it on?"],
      ["太贵了。", "It's too expensive."],
      ["可以便宜一点吗？", "Can you make it cheaper?"],
      ["可以刷卡吗？", "Can I pay by card?"],
      ["我买了。", "I'll take it."],
    ],
  },
  {
    id: "way", icon: "🧭", title: "问路出行", lines: [
      ["洗手间在哪里？", "Where is the restroom?"],
      ["地铁站怎么走？", "How do I get to the subway station?"],
      ["离这里远吗？", "Is it far from here?"],
      ["一直往前走。", "Go straight ahead."],
      ["在路口左转。", "Turn left at the corner."],
      ["我迷路了。", "I'm lost."],
      ["请带我去这个地址。", "Please take me to this address."],
    ],
  },
  {
    id: "gym", icon: "🏋️", title: "健身训练", lines: [
      ["我们先热身吧。", "Let's warm up first."],
      ["深呼吸。", "Take a deep breath."],
      ["保持这个姿势。", "Hold this position."],
      ["再做十次。", "Do ten more reps."],
      ["你的膝盖疼吗？", "Does your knee hurt?"],
      ["挺胸，收紧核心。", "Chest up, keep your core tight."],
      ["慢慢放下。", "Lower it slowly."],
      ["休息一分钟。", "Take a one-minute break."],
      ["做得很好！", "Good job!"],
      ["下周同一时间见。", "See you at the same time next week."],
    ],
  },
  {
    id: "work", icon: "💼", title: "工作日常", lines: [
      ["我今天很忙。", "I'm very busy today."],
      ["会议几点开始？", "What time does the meeting start?"],
      ["请给我发邮件。", "Please send me an email."],
      ["我马上到。", "I'll be right there."],
      ["你现在有空吗？", "Are you free now?"],
      ["我们明天再谈。", "Let's talk tomorrow."],
      ["没问题。", "No problem."],
    ],
  },
  {
    id: "time", icon: "⏰", title: "时间天气", lines: [
      ["现在几点了？", "What time is it?"],
      ["今天星期几？", "What day is it today?"],
      ["今天天气很好。", "The weather is nice today."],
      ["下雨了。", "It's raining."],
      ["今天很冷。", "It's cold today."],
      ["我们周末见。", "See you this weekend."],
    ],
  },
  {
    id: "feel", icon: "😊", title: "心情感受", lines: [
      ["我很开心。", "I'm very happy."],
      ["我累了。", "I'm tired."],
      ["我有点紧张。", "I'm a little nervous."],
      ["别担心。", "Don't worry."],
      ["太棒了！", "That's great!"],
      ["我同意。", "I agree."],
    ],
  },
];

export const GROUP_SIZE = 10;
