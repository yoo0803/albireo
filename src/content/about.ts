// Albireo 이야기: 소개 페이지 · 환영 메일 (ko / en)

export type Chapter = { no: string; title: string; body: string[]; quote?: string };

export const ABOUT: Record<"ko" | "en", { kicker: string; title: string; lede: string; chapters: Chapter[]; facts: [string, string][]; close: string }> = {
  ko: {
    kicker: "About: β Cygni",
    title: "두 개의 빛, 같은 방향",
    lede: "Albireo라는 이름에 담은 이야기입니다.",
    chapters: [
      {
        no: "01",
        title: "두 개의 빛",
        body: [
          "백조자리의 부리에 자리한 알비레오(β Cygni)는 밤하늘에서 가장 아름다운 이중성 가운데 하나로 꼽힙니다. 작은 망원경으로도 황금빛 알비레오 A와 푸른빛 알비레오 B가 나란히 빛나는 모습을 볼 수 있습니다.",
          "오랫동안 사람들은 두 별이 서로를 끌어당기며 함께 공전한다고 믿어 왔습니다.",
        ],
      },
      {
        no: "02",
        title: "겉보기 이중성",
        body: [
          "그러나 가이아 위성의 측정에 따르면 두 별은 우리로부터의 거리가 수십 광년이나 차이 납니다. 하늘을 가로지르는 움직임의 방향과 속도도 서로 다릅니다. 그래서 오늘날 많은 천문학자들은 알비레오 A와 B가 서로를 공전하는 것이 아니라, 우연히 같은 방향에 겹쳐 보이는 ‘겉보기 이중성’일 가능성이 높다고 봅니다.",
          "그렇지만 황금빛 알비레오 A는 그 자체로 진짜 쌍성입니다. 주황빛 거성 Aa와 푸르스름한 동반성 Ac가 서로의 중력에 이끌려 약 120년에 한 바퀴씩, 지금도 함께 공전하고 있습니다.",
        ],
      },
      {
        no: "03",
        title: "우리의 궤도",
        body: [
          "우리는 알비레오 A와 B처럼 우연히 서로를 만나, 우연히 같은 방향으로 걷기도 합니다. 그러다 살면서 물리적으로든 상황적으로든 멀어지게 됩니다. 그래도 여전히 추억을 나누고, 함께 세월을 보내며 나아갑니다.",
          "알비레오 A처럼 서로에게 단단히 묶여 끊임없이 영향을 주고받으며 함께 공전한다면, 그 또한 낭만적이겠지요.",
          "어린 시절의 우정은 대개 알비레오 A의 쌍성처럼 시작해, 시간이 흐르며 알비레오 A와 B처럼 먼 거리에서 각자의 길을 가게 됩니다. 그렇지만 망원경으로 바라본 두 별이 여전히 서로를 끌어당기며 함께 도는 것처럼, 황금과 물빛이 어우러진 하나의 풍경으로 보이듯이, 우리는 멀어지더라도 저마다의 빛으로 빛나며, 함께 아름답게 나아갈 수 있습니다.",
        ],
        quote: "멀어지더라도,\n각자 빛나며 함께 앞으로.",
      },
      {
        no: "04",
        title: "스스로 빛나는 별이 되기까지",
        body: [
          "Albireo는 이 이야기를 모티브로 만들어졌습니다. 알비레오 A의 쌍성처럼 가까이에서 시작해, 알비레오 A와 B처럼 각자 독립된 존재로 아름답게 빛나고, 나아가 다른 별을 비추는 항성이 되어 가는 우리의 여정을 담고자 합니다.",
          "서로 다른 분야, 다른 공간, 다른 시간.\n그럼에도 함께 배우고 나누며, 그럼으로써 함께, 그리고 혼자 나아갑니다.",
        ],
      },
    ],
    facts: [
      ["별자리", "백조자리 β (Cygnus)"],
      ["보이는 간격", "약 35″, 위치각 54°, 3.1등/5.1등"],
      ["알비레오 A", "주황빛 거성 Aa (K2 II) + 동반성 Ac (B8), 0.4″, 주기 약 122년"],
      ["알비레오 B", "빠르게 자전하는 푸른 Be별 (B8 Ve)"],
      ["거리 (가이아)", "A 약 365광년, B 약 395광년 (A는 오차가 큼)"],
      ["A와 B의 관계", "겉보기 이중성일 가능성이 높음 (움직임이 서로 다름)"],
    ],
    close: "각자의 궤도에서, 함께 앞으로.",
  },
  en: {
    kicker: "About: β Cygni",
    title: "Two lights, one direction",
    lede: "The story behind the name Albireo.",
    chapters: [
      {
        no: "01",
        title: "Two lights",
        body: [
          "Set at the beak of Cygnus, the Swan, Albireo (β Cygni) is often called one of the most beautiful double stars in the night sky. Even a small telescope shows golden Albireo A and blue Albireo B shining side by side.",
          "For a long time, people believed the two stars were pulling on each other, circling together.",
        ],
      },
      {
        no: "02",
        title: "An apparent double",
        body: [
          "Yet according to the Gaia satellite, their distances from us differ by tens of light years, and they drift across the sky in different directions at different speeds. So many astronomers now think Albireo A and B are not orbiting each other at all, but are most likely an optical double: two stars that merely line up from where we stand.",
          "Golden Albireo A, however, is a true binary in its own right. The orange giant Aa and its bluish companion Ac are held by each other’s gravity, completing one orbit roughly every 120 years.",
        ],
      },
      {
        no: "03",
        title: "Our orbits",
        body: [
          "Like Albireo A and B, we meet by chance and sometimes, by chance, walk in the same direction. Then life moves us apart, in distance or in circumstance. Still, we keep sharing memories and keep moving forward through the years together.",
          "To stay bound like Albireo A, shaping each other as we circle on, would be its own kind of romance.",
          "Childhood friendships usually begin like the binary of Albireo A, and in time become like Albireo A and B, each going its own way at a distance. But just as the two stars, seen through a telescope, still seem to pull at each other and turn together in one view of gold and water-blue, we can drift apart and still shine, each with our own light, moving forward beautifully together.",
        ],
        quote: "Even apart,\neach shining, moving forward together.",
      },
      {
        no: "04",
        title: "Becoming a star of our own",
        body: [
          "Albireo grew out of this story. It follows our journey from the close orbit of Albireo A to the independence of A and B: each of us shining on our own, and in time becoming a star that lights others.",
          "Different fields, different places, different times.\nEven so, we learn and share together,\nand in doing so we move forward together and alone.",
        ],
      },
    ],
    facts: [
      ["Constellation", "Cygnus (β Cygni)"],
      ["Apparent gap", "≈ 35″, PA 54°, mag 3.1/5.1"],
      ["Albireo A", "Orange giant Aa (K2 II) + companion Ac (B8), 0.4″, P ≈ 122 yr"],
      ["Albireo B", "Fast-spinning blue Be star (B8 Ve)"],
      ["Distance (Gaia)", "A ≈ 365 ly, B ≈ 395 ly (large error for A)"],
      ["A–B relation", "Most likely an optical double (different motions)"],
    ],
    close: "Each in our own orbit, forward together.",
  },
};

// 환영 메일: 짧은 판
export const WELCOME: Record<"ko" | "en", { subject: string; title: string; body: string[]; more: string }> = {
  ko: {
    subject: "Albireo를 구독해 주셔서 감사합니다",
    title: "구독해 주셔서 감사합니다.",
    body: [
      "알비레오는 황금빛 A와 푸른빛 B가 서로를 끌어당기듯 공전하는 모습으로 유명한 별입니다. 하지만 두 별은 거리가 수십 광년이나 달라, 우연히 같은 방향에 겹쳐 보이는 ‘겉보기 이중성’일 가능성이 높다고 알려져 있습니다. 반면 황금빛 A는 그 자체로 서로의 중력에 묶여 함께 도는 진짜 쌍성입니다.",
      "우리도 한때는 A의 두 별처럼 가까이 돌다가, 언젠가 A와 B처럼 각자의 거리에서 각자의 길을 걷게 됩니다. 그래도 망원경 속 두 별이 여전히 황금과 물빛으로 나란히 빛나듯, 멀어져도 우리는 저마다의 빛으로 빛나며 함께 나아갈 수 있습니다.",
      "Albireo는 그 여정을 담습니다.\n다른 분야, 다른 공간, 다른 시간 속에서도 함께 배우고 나누며,\n함께, 또 혼자 나아가는 이야기를 보내 드리겠습니다.",
    ],
    more: "Albireo 이야기 전체 읽기",
  },
  en: {
    subject: "Thank you for subscribing to Albireo",
    title: "Thank you for subscribing.",
    body: [
      "Albireo is famous for golden A and blue B, which seem to circle each other. In fact their distances differ by tens of light years, and they are most likely an apparent double that only lines up from where we stand. Golden A, though, is a true binary, two stars bound by each other’s gravity.",
      "We too begin close, like the pair inside A, and one day find ourselves like A and B, each on our own path at a distance. Yet just as the two still shine side by side in gold and water-blue through a telescope, we can drift apart and still move forward together, each shining with our own light.",
      "Albireo holds that journey.\nAcross different fields, places and times, we learn and share,\nand we will send you the stories of moving forward together and alone.",
    ],
    more: "Read the full Albireo story",
  },
};
