# Roots — Customary Terms Glossary

Comprehensive glossary of all non-English customary terms used across the Roots family tree app.
Sources: `lookups.js`, `customary.js`, `data.js`, `app.js`, `ROOTS_Cultural_Data_Structure.md`, `Roots App Research Update.txt`, `Roots App Notes.txt`.

---

## 1. Succession, Lifecycle & Death

| Term | Language | Literal Translation | Functional Meaning in App | Source |
|------|----------|-------------------|--------------------------|--------|
| **Nhaka** | Shona | Inheritance, legacy | The estate and responsibilities of a deceased person; also used as a lifecycle state (`NHAKA_RESOLVED`) | `customary.js:78`, `customary.js:250` |
| **Kugara Nhaka** | Shona | To sit/ settle the inheritance | The final phase where estate is distributed and successor is installed after ritual clearance | `customary.js:226`, `customary.js:251` |
| **Kuchenura** | Shona | To cleanse / purify | Cleansing ceremony phase after burial; first ritual phase | `customary.js:239` |
| **Kubvisa** | Shona | To remove | Removal of mourning attire ceremony; second ritual phase | `customary.js:240` |
| **Kugadza** | Shona | To install / establish | Installation of the heir ceremony; third ritual phase | `customary.js:241` |
| **Zera** | Shona | Generation / age set | Living elder of an elder generation who blocks succession; used in `hasZera()` disqualification check | `customary.js:198`, `data.js:326` |
| **Kuremara** | Shona | To be physically disabled / incomplete | Physical wholeness flag; traditional disqualification for succession if set to true | `customary.js:213`, `data.js:326` |
| **Mhosva** | Shona | Crime / guilt / moral failing | Criminal or moral disqualification flag; used in `hasMhosva()` and `Mhosva neHuroyi` (witchcraft accusation) | `customary.js:219`, `data.js:326` |
| **Mhosva neHuroyi** | Shona | Crime of witchcraft | Serious moral/criminal disqualification from succession | `customary.js:191` |
| **Rufu** | Shona | Death | The event of death; triggers the lifecycle state machine | Research Update |
| **Mudzimu** (pl. **Vadzimu**) | Shona | Ancestral spirit | The deceased transformed into a protective guardian ancestor after final rituals | Research Update |
| **Mweya weMubvebve** | Shona | Wandering spirit | Unanchored ghost state before final ritual elevation to Mudzimu | Research Update |
| **Kurova Makuva** | Shona | To beat the graves | Major ceremony ~1 year after death; brings home the spirit and elevates node to ancestor | Research Update |
| **Magadzira** | Shona | Final burial rites | Alternate name for the spiritual anchoring ceremony (Kurova Makuva) | Research Update |
| **Bhuku reChemo** | Shona | Book of condolence/ contribution | Ledger tracking communal funeral contributions (cash, food) for future reciprocity | Research Update |
| **Chemo** | Shona | Funeral contribution | Token cash or foodstuff contributed by visitors during a funeral | Research Update |
| **Mhere** | Shona | Wailing / alarm | Formal wailing that alerts the village of a death | Research Update |
| **Parufu** | Shona | At the death place | The homestead gathering during the mourning period | Research Update |
| **Kurasira** | Shona | To cast away / discard | Disposal of deceased's personal items to prevent spiritual lingering | Research Update |
| **Nyaradzo** | Shona | Consolation | Memorial service weeks/months post-burial; debts are declared publicly | Research Update |
| **Kugovera Mbatya** | Shona | Distribution of clothes | Formal allocation of deceased's clothing to bloodline relatives (6–12 months) | Research Update |
| **Bira** | Shona | Traditional beer (millet) | Home-brewed millet beer used in the final Kurova Makuva ceremony | Research Update |
| **Masawo** | Shona | Traditional mats | Mats on which deceased's belongings are spread for distribution | Research Update |
| **Isinyama** | Ndebele | Shadow of grief / dark shadow | Spiritual pollution from death that must be ritually cleansed | Research Update |
| **Idlozi** (pl. **AmaDlozi**) | Ndebele | Ancestor spirit | Elevated ancestral guardian after Ukubuyisa ceremony | Research Update |
| **Ukufa** | Ndebele | Death | General term for death | Research Update |
| **Ukuphutha / Ukuhamba** | Ndebele | To pass / to go | Honorific euphemisms for death | Research Update |
| **Isaziso lesikhumbuzo** | Ndebele | Notification and remembrance | First phase: notification and night vigil after death | Research Update |
| **Ukungcwaba** | Ndebele | To bury | Burial protocol phase (day 3–5) | Research Update |
| **Ukugezwa Kwezikhali** | Ndebele | Cleansing of tools | Ritual wash of burial tools and family after interment | Research Update |
| **Ukukhanyisa** | Ndebele | To give light / memorial | Short memorial gathering (month 1–3) | Research Update |
| **Ukubuyisa** | Ndebele | To bring back | The final ceremony to bring the spirit home as an Idlozi (year 1–2) | Research Update |
| **Inzilo** | Ndebele | Mourning state | Surviving spouse's mourning restriction period (~1 year); tracked as a state flag | Research Update |
| **Ukudla Ifa** | Ndebele | To eat the inheritance | Estate distribution assembly after Ukubuyisa is complete | Research Update |
| **Izibulo** | Ndebele | Firstborn son | Primary heir under Ndebele primogeniture; inherits status, name, and role | Research Update |
| **Isibaya** | Ndebele | Cattle kraal / base herd | Core cattle herd held in trust by the eldest son | Research Update |
| **Inkomo Wesithole** | Ndebele | Heifer for younger sons | Specific heifers apportioned to younger brothers | Research Update |
| **Impahla Zomndeni** | Ndebele | Household / intimate goods | Domestic assets that remain with the maternal core of the household | Research Update |
| **Ukuvusa Igama** | Ndebele | To revive the name | Formal bestowal of the father's traditional name upon the heir | Research Update |
| **DECEASED_FROZEN** | App-internal | N/A | Lifecycle state: person died, no rituals completed yet | `customary.js:76` |
| **RITUAL_CLEARED** | App-internal | N/A | Lifecycle state: funeral and ritual phases completed | `customary.js:77` |
| **NHAKA_RESOLVED** | App-internal | N/A | Lifecycle state: estate fully distributed, succession complete | `customary.js:78` |

---

## 2. Marriage & Bridewealth (Roora / Amalobolo / Chiko)

| Term | Language | Literal Translation | Functional Meaning in App | Source |
|------|----------|-------------------|--------------------------|--------|
| **Roora** | Shona | Bridewealth | The full Shona marriage negotiation and payment process | `customary.js:319`, `customary.js:322` |
| **Lobola** | Shona/Ndebele | Bridewealth | Alternate term for bridewealth (pan-Southern African) | Research Update |
| **Amalobolo** | Ndebele | Bridewealth | The Ndebele marriage negotiation and cattle-payment system | Research Update |
| **Chiko** | Tonga | Bridewealth | Tonga bridewealth; does not transfer children to father's clan | Research Update |
| **Dare** | Shona | Traditional court | The main negotiation meeting/ court where Roora is discussed | `customary.js:325` |
| **Kubvunza** | Shona | To ask | First phase: family emissaries ask for the bride's hand; also Ukucela (Ndebele) | `customary.js:323` |
| **Kuzivisa** | Shona | To make known | Second phase: formal introduction of the two families; Ukwazisa (Ndebele) | `customary.js:324` |
| **Rusambo** | Shona | Core bride price | The foundational bride price paid to the father; legally binds the marriage | `customary.js:326` |
| **Mombe yeHumai** | Shona | Mother's cow | Non-refundable live cow for the mother; cannot be cash-substituted | `customary.js:327`, `customary.js:247` |
| **Maputiro** | Shona | Pre-wedding ceremony | Pre-wedding ceremony payment; also Ukuyala (Ndebele) | `customary.js:328` |
| **Chiredzwa** | Shona | Final / totem-clearing payment | Final payment that clears the totem for out-of-wedlock children | `customary.js:329` |
| **Mbudzi** | Shona | Goat | Goat ceremony — post-wedding ritual; Imbuzi (Ndebele) | `customary.js:330` |
| **Kupinza** | Shona | To bring in / receive | Bride officially received into groom's family; Ukungenisa (Ndebele) | `customary.js:331` |
| **Munyai** | Shona | Go-between / messenger | The groom's lead negotiator who does all the talking | Research Update |
| **Vatete** | Shona | Paternal aunt | Bride's paternal aunt; mediator protecting bride's interests in negotiations and funerals | Research Update |
| **Vakwasha** | Shona | Groom's party / in-laws | The groom's delegation at a Roora negotiation | Research Update |
| **Tezvara** | Shona | Father-in-law | Bride's father; primary recipient of Rusambo | Research Update |
| **Ambuya** | Shona | Mother-in-law / grandmother | Bride's mother; recipient of Mombe yeHumai | Research Update |
| **Zvirehwa** | Shona | Fines | Penalties imposed on Vakwasha for protocol violations during Roora | Research Update |
| **Vhuramuromo** | Shona | Mouth opener | Initial fee sent with the letter to request a negotiation date | Research Update |
| **Kunyora Tsamba** | Shona | To write a letter | Formal letter from groom's side requesting a negotiation date | Research Update |
| **Zvirango** | Shona | Entry protocol fees | Fees paid on the morning of Roora before entering the homestead | Research Update |
| **Ndinoreva muromo** | Shona | I speak with my mouth | Permission-to-speak fee paid to elders | Research Update |
| **Kupinda mumusha** | Shona | To enter the home | Gate entry fee to walk onto the property | Research Update |
| **Makadiniko** | Shona | How are they? (greeting) | Fee for greeting the elders | Research Update |
| **Zvamai** | Shona | Things of the mother | Phase honoring the mother before father speaks | Research Update |
| **Mbonano** | Shona | Seeing / meeting | Fee to physically see and greet the mother (Mbonano yeAmbuya) | Research Update |
| **Mafuta eAmbuya** | Shona | Oil for the mother-in-law | Money for body lotion for the mother | Research Update |
| **Matwiro** | Shona | Pounding (grain) | Compensating mother for pounding grain for the bride | Research Update |
| **Danga** | Shona | Cattle pen / herd | The cattle portion of the dowry demanded by the father | Research Update |
| **Zvatezvara neMbatya** | Shona | Father-in-law's clothes | Parental wardrobe demands (suits, dresses for parents) | Research Update |
| **Madyo / Majaka** | Shona | Eating / feasting | The welcoming feast after all fees are accepted | Research Update |
| **Kunhonga / Kunonga** | Shona | To pick up | Cash the bride picks up to signal consent to final figures | Research Update |
| **Pasi weMhazi** | Shona | Ground of the potsherd | Respect paid to the ground/ancestors of the home | Research Update |
| **Majuzi** | Shona | Clothing items | Formal outfits for parents as part of dowry demands | Research Update |
| **Mari yemafuta** | Shona | Cooking oil money | Fee paid by groom to fund the celebration feast cooking | Research Update |
| **Kutsika mbeu** | Shona | To step on the seeds | Fine for arriving late ("stepping on the crops") | Research Update |
| **Kugona mukanwa** | Shona | To sleep in the mouth | Fine for speaking directly to elders instead of through Munyai | Research Update |
| **Kupinda nemukanwa** | Shona | To enter through the mouth | Fine for entering through wrong door or sitting improperly | Research Update |
| **Saga reMunyu** | Shona | Bag of salt | Manyika-specific entry item in bridewealth negotiations | Research Update |
| **Zvikwambo** | Shona | Token items | Ndau-specific tokens/beadwork in bridewealth | Research Update |
| **Ukhula** | Ndebele | Go-between | Ndebele equivalent of Munyai; diplomat for groom's family (Abayeni) | Research Update |
| **Abayeni** | Ndebele | Groom's delegation | The groom's party at an Amalobolo negotiation | Research Update |
| **Omalume** (sg. **Umalume**) | Ndebele | Maternal uncles | Most critical Ndebele role; maternal uncle has veto power in marriage and funerals | Research Update |
| **Abomama** | Ndebele | Mothers / aunts | Female relatives who receive specific gifts during negotiations | Research Update |
| **Isicelo** | Ndebele | The request / asking | First phase: formal letter requesting a negotiation date | Research Update |
| **Isivulamulomo** | Ndebele | Mouth opener | Cash sent with the letter to initiate talks; equivalent to Vhuramuromo | Research Update |
| **Ukungena** | Ndebele | To enter | Gate entry protocols and fees on arrival morning | Research Update |
| **Ikhangaziwe** | Ndebele | Let me be known | Fee to introduce the groom's family to household ancestors | Research Update |
| **Ukubona Amehlo** | Ndebele | To see the eyes | Fee to look parents in the eyes and state intentions | Research Update |
| **Ikhazi** | Ndebele | Cattle dowry | The core cattle count (5–10 beasts) in Ndebele marriage | Research Update |
| **Inkomo kaMama** | Ndebele | Mother's cow | Mandatory live cow for mother; equivalent to Mombe yeHumai | Research Update |
| **Inkomo kaMalume** | Ndebele | Maternal uncle's cow | Standardized beast or cash for maternal uncle's blessing | Research Update |
| **Izibizo** | Ndebele | Family demands | Physical manifest of required material gifts (blankets, clothing) | Research Update |
| **Amacansi** | Ndebele | Traditional blankets | Heavy blankets demanded as part of Izibizo | Research Update |
| **Umsindo / Isitshwala** | Ndebele | Celebration feast | Token to thank women cooking the celebration meal | Research Update |
| **Ukwamukelwa** | Ndebele | To be welcomed | Evening feast concluding the negotiation | Research Update |
| **Isigo** (pl. **Izigo**) | Ndebele | Fine | Penalties for protocol violations during Ndebele negotiations | Research Update |
| **Mafwa** | Tonga | Inheritance | Tonga matrilineal inheritance; estate passes to sister's sons, not own children | Research Update |
| **BaMalume** | Tonga | Maternal uncle | The legal and economic custodian of sister's children; primary heir | Research Update |
| **MUTUPO_VEKUBEREKANA** | App-internal (Shona) | Totem of reproduction | App error code when marriage is blocked due to identical totem + praise name | `customary.js:14` |

---

## 3. Kinship, Totem & Identity Architecture

| Term | Language | Literal Translation | Functional Meaning in App | Source |
|------|----------|-------------------|--------------------------|--------|
| **Mutupo** (pl. **Mitupo**) | Shona | Totem / clan animal | Primary totem category (animal, organ, or object); inherited patrilineally | `data.js:322`, `lookups.js` |
| **Chidawo** (pl. **Zvidawo**) | Shona | Praise name / sub-clan name | Sub-clan lineage descriptor that distinguishes branches within a Mutupo | `data.js:322`, `lookups.js:35` |
| **Isibongo** (pl. **Izibongo**) | Ndebele | Clan name / surname | Ndebele equivalent of Mutupo; functions as both surname and totem identifier | `lookups.js:67` |
| **Izithakazelo** | Ndebele | Praise names / clan praises | Ndebele equivalent of Zvidawo; ancestral praise names used in formal address | `lookups.js:67` |
| **Detembo** (pl. **Detembo**) | Shona | Praise poem | Full poetic recitation of clan history and praises; also called Chidawo recitation | Research Update |
| **Mukowa** (pl. **Mikowa**) | Tonga | Matriclan | Mother's clan; the primary lineage anchor for Tonga identity | `data.js:323`, Research Update |
| **Luzubo** | Tonga | Patriclan | Father's clan; secondary lineage anchor for Tonga (does not confer inheritance rights) | `data.js:323`, Research Update |
| **LineageAnchorType** | App-internal | N/A | Enum tracking how a person's totem lineage was determined | `data.js:324` |
| **BIOLOGICAL_FATHER** | App-internal | N/A | Anchor type: totem inherited from biological father (patrilineal default) | `customary.js:48` |
| **MATERNAL_GRANDFATHER** | App-internal | N/A | Anchor type: totem inherited from maternal grandfather (totem drift / Tonga) | `customary.js:51` |
| **COMPUTED_FLOATING** | App-internal | N/A | Anchor type: totem unknown or unanchored (dashed connector line in tree) | `customary.js:58` |
| **CUSTOMARY_OVERRIDE** | App-internal | N/A | Anchor type: manual elder-confirmed override (Ngozi / Kumutsa Mapfihwa) | `data.js:324` |
| **Ngozi** | Shona | Avenging spirit | Spiritual lineage override case; a person raised in another clan's spiritual care | `customary.js:132` |
| **Kumutsa Mapfihwa** | Shona | To wake the hearthstones | Ritual of re-establishing a spiritual hearth for a displaced lineage | `customary.js:132` |
| **Guruuswa** | Shona | Ancient grasslands (origin) | The ancestral origin node; for Shona, traces to Guruuswa (northern grasslands) | `data.js:329`, Research Update |
| **TONGA_MATRILINEAL** | App-internal | N/A | Cultural system flag: Tonga matrilineal descent (overrides patrilineal defaults) | `data.js:321` |
| **SHONA** | App-internal | N/A | Cultural system flag: Shona patrilineal default | `data.js:321` |
| **NDEBELE** | App-internal | N/A | Cultural system flag: Ndebele patrilineal default | `lookups.js:67` |
| **culturalSystem** | App-internal | N/A | Field on person.kinship; one of SHONA, NDEBELE, TONGA_MATRILINEAL, OTHER | `data.js:321` |
| **Miko** (sg. **Muito**) | Shona | Taboo / dietary restriction | Totem-specific dietary prohibition (e.g. not eating your totem animal) | Research Update |
| **Izila** | Ndebele | Taboo / dietary restriction | Ndebele equivalent of Miko; dietary prohibitions tied to clan | Research Update |
| **Kutyora miko** | Shona | To break a taboo | Violation of a totem's dietary restriction; believed to bring spiritual bad luck | Research Update |
| **Tsumo** (pl. **Tsumo**) | Shona | Proverb | Traditional Shona proverbs used in dispute resolution, kinship logic, and UI tooltips | `lookups.js:93` |
| **Izaga** (sg. **Isaga**) | Ndebele | Proverb | Traditional Ndebele proverbs stored alongside Shona Tsumo in the library | `lookups.js` |
| **Kuwuchira** | Shona | Clapping protocol | Gendered hand-clapping styles for showing respect (men: flat; women: cupped) | Research Update |
| **Kutyora ibvi** | Shona | To bend the knee | Women's respectful knee-bend gesture accompanying cupped-hand clapping | Research Update |
| **Kwaziso** | Shona | Greeting / salutation | Traditional greeting protocol; varies by time of day and person's status | Research Update |
| **Mangwanani** | Shona | Morning | Morning greeting phrase | `lookups.js:87` |
| **Masikati** | Shona | Afternoon | Afternoon greeting phrase | `lookups.js:88` |
| **Manheru** | Shona | Evening | Evening greeting phrase | `lookups.js:89` |
| **Livuke njani?** | Ndebele | How did you wake? | Ndebele morning greeting | `lookups.js:87` |
| **Litshone njani?** | Ndebele | How did you spend the day? | Ndebele afternoon greeting | `lookups.js:88` |
| **Maita** | Shona | Thank you / well done | Gratitude prefix in totem greetings (e.g., "Maita Moyondizvo, Changamire") | `lookups.js:35` |
| **Bayethe** | Ndebele | Hail / royal greeting | Honorific greeting for Ndebele royalty (e.g., "Bayethe Mntungwa, Khumalo!") | `lookups.js:67` |
| **Ngiabonga** | Ndebele | I thank you | Gratitude expression in Ndebele totem greetings | `lookups.js:68` |
| **Sawubona** | Ndebele | Hello (I see you) | Standard Ndebele greeting | Research Update |
| **Mhoroi** | Shona | Hello (to them) | Standard Shona greeting used in totem address | Research Update |

---

## 4. Administrative & Traditional Roles

| Term | Language | Literal Translation | Functional Meaning in App | Source |
|------|----------|-------------------|--------------------------|--------|
| **Sabhuku** | Shona | Village head / bookkeeper | Lowest traditional administrative node; keeps the village registration book | `data.js:318`, Spec |
| **Ushabhuku** | Shona | Village head position | The office/ jurisdiction of a Sabhuku | Research Update |
| **Sadunhu** | Shona | Headman | Sub-chief jurisdiction under a Chief; Level 5 admin | Research Update |
| **Isiduna** (pl. **Izinduna**) | Ndebele | Headman / councilor | Ndebele equivalent of Sadunhu; also refers to local traditional leaders | Research Update |
| **Umambo** | Shona | Chieftainship | The jurisdiction of a recognised Chief (~272 in Zimbabwe) | Research Update |
| **Mambo** | Shona/ Ndebele | Chief / king | Title for a traditional chief or king; also used in Ndebele as clan praise (Mambo of Ngwenya) | `lookups.js:72` |
| **Dare** | Shona | Traditional court | Council of elders or traditional court that resolves lineage/land disputes | Research Update |
| **Matare** (pl.) | Shona | Traditional courts | Plural of Dare; the traditional court system | Research Update |
| **Sahwira** | Shona | Ritual friend / undertaker | Non-bloodline friend who manages funeral logistics; cannot be overruled by blood relatives | Research Update |
| **Muzukuru** | Shona | Nephew / grandchild | Paternal grandchild who serves as operational foreman at funerals | Research Update |
| **Vabereki** | Shona | Parents / in-laws (maternal) | Maternal in-laws; Vatete negotiates with them to clear payments before burial | Research Update |
| **Abakhwenyana** | Ndebele | In-laws / sons-in-law | Perform physical grave-digging and heavy funeral logistics | Research Update |
| **Munyai** | Shona | Go-between / messenger | The groom's lead negotiator in Roora; handles all money and talking | Research Update |
| **Ukhula** | Ndebele | Go-between | Ndebele equivalent of Munyai; must know bride's Izithakazelo perfectly | Research Update |
| **Vatete** | Shona | Paternal aunt | Holds absolute authority over female aspects of weddings and funerals | Research Update |
| **Umalume** (pl. **Omalume**) | Ndebele | Maternal uncle | Legal observer in funerals; must sign off on Ndebele marriages | Research Update |
| **BaMalume** | Tonga | Maternal uncle | Legal and economic custodian of sister's children; primary inheritance node | Research Update |
| **Dangwe** | Shona | Firstborn child | The eldest sibling; ranked highest in seniority | Research Update |
| **Chigupawanga** | Shona | Lastborn child | The youngest sibling; ranked lowest in seniority | Research Update |
| **Maviri** | Shona | Second-born | The second child in birth order | Research Update |
| **Amai Guru** | Shona | Senior mother | First/senior wife in a polygamous marriage (houseRank = 1) | `ROOTS_Cultural_Data_Structure.md` |
| **Imba** (pl. **Dzimba**) | Shona | House | Polygamous house grouping; children grouped under the mother's "House" | `ROOTS_Cultural_Data_Structure.md` |
| **Indlu** (pl. **Izindlu**) | Ndebele | House | Ndebele equivalent of Imba; polygamous house grouping | `ROOTS_Cultural_Data_Structure.md` |
| **VillageBookId** | App-internal | N/A | Field for the village registration book number (e.g., "V-GORO-042") | `data.js:318` |
| **Ekhaya** | Ndebele | At home | The family homestead where funeral gatherings occur | Research Update |
| **Kumusha** | Shona | To/at the rural home | The rural homestead where burial and rituals take place | Research Update |
| **Isibaya** | Ndebele | Cattle kraal | Cattle enclosure; burial near it carries structural weight for male heads | Research Update |

---

## 5. Shona Totem Registry (Mitupo) — Full Entries

Each entry: **Totem (English)** → system key used in app, with **Zvidawo** (praise names), **Greeting**, **Proverb**, **Taboo (Miko)**.

| Totem Key (in app) | System | Zvidawo / Izithakazelo | Greeting | Proverb | Taboo |
|--------------------|--------|----------------------|----------|---------|-------|
| Moyo (Moyondizvo) | SHONA | Moyondizvo, Dehwa, Bvumavaranda, Mithasa | Maita Moyondizvo, Changamire. | Moyo muti, unomera paunoda. | Heart of any animal |
| Moyo (Chirandu) | SHONA | Chirandu, Muzukuru, Machuma, Monomotapa | Maita Chirandu, vari munaSvosve. | Kandiro kanoenda kunobva kamwe. | Lungs of animal |
| Moyo (Sinyoro) | SHONA | Sinyoro, Vachinjanja, Donzvambeva | Maita Sinyoro, maita zvenyu. | Kure kwegava ndokusina musungusungu. | Spleen of animal |
| Shumba (Murambwi) | SHONA | Murambwi, Chibi, Sipambi, Nyamuzihwa | Maita Shumba, vari Chibi, Murambwi. | Shumba inodya inofamba. | Lion meat and paws |
| Shumba (Mhazi) | SHONA | Mhazi, Nyamuzihwa, Mukatayi, Chinamhora | Maita Mhazi, vari Chishawasha. | Pasi pomoto pane madota. | Big cat claws and flesh |
| Soko/Shoko (Mukanya) | SHONA | Mukanya, Chinamora, Vhudzijena, Soko | Maita Mukanya, Soko Mukanya. | Tsoko kana yoti tsvo, yaona bako. | Velvet monkey |
| Soko/Shoko (Murehwa) | SHONA | Murehwa, Mutasa, Mwari, Mbire | Maita Murehwa, vari muMbire. | Chara chimwe hachitswanyi hinda. | Baboon |
| Mbizi (Samaita) | SHONA | Samaita, Mutasa, Dhuve, Wakapiwa | Maita Samaita, heri Mbizi. | Mbizi ikaswera mumatope inofana nembongoro. | Zebra flesh |
| Tembo (Mazvimbakupa) | SHONA | Mazvimbakupa, Wandishona, Chitehwe | Maita Tembo, Mazvimbakupa. | Ndambakuudzwa akaonekwa nembonje pamhanza. | Zebra stripe-skin / liver |
| Nzou (Samanyanga) | SHONA | Samanyanga, Marange, Katasa | Maita Samanyanga, vari muBocha. | Nzou hairemerwi nenyanga dzayo. | Elephant trunk |
| Zhou (Mhukahuru) | SHONA | Mhukahuru, Divaremvura, Sukumani | Maita Zhou, vari muMberengwa. | Mviromviro dzembanje dzinotanga nemashizha. | Elephant flesh |
| Shava (Mhofu/Museyamwa) | SHONA | Mhofu, Museyamwa, Chisvi, Nhuka | Maita Mhofu, Museyamwa. | Mhofu yomukono haina danga. | Eland flesh |
| Shava (Chihera) | SHONA | Chihera, Mutenhesanwa, Nyakudirwa | Maita Chihera, Chidavarume. | Mukadzi anofamba haashayi mapfihwa. | Female Eland |
| Gumbo (Madyirapasi) | SHONA | Madyirapasi, Chitova, Gutu, Madyarapanze | Maita Gumbo, Madyirapasi, vari muGutu. | Gumbo rine mhanza rinotsika pane rine rombe. | Cloven-hoofed animals |
| Dziva/Hove/Mvuu (Mbedzi) | SHONA | Mbedzi, Sambiri, Musaigwa, Muyambo, Dziriro | Maita Dziva, vari muMatonjeni. | Hove dzinofamba nemvura. | Scale fish; Hippopotamus |
| Ngara/Nungu (Chipunza) | SHONA | Chipunza, Zimuto, Wamambo, Mukanyairi, Mafuzi | Maita Ngara, Chipunza. | Nungu haisweli musaga. | Porcupine |
| Garwe (Nyamasvisva) | SHONA | Nyamasvisva, Mamba, Chiwawa | Maita Garwe, Nyamasvisva. | Garwe haridyi chebamba. | Crocodile meat |
| Nyati (Chidawanyika) | SHONA | Chidawanyika, Muchenje, Shanyai, Chirombowe | Maita Nyati, Chidawanyika. | Nyati haityi vana vaduku. | Buffalo meat |
| Humba/Nguruve (Nyakuvimba) | SHONA | Nyakuvimba, Makombe, Chingowo | Maita Humba, vari muMakombe. | Humba inotenda panyoro. | Wild boar |
| Beta/Ishwa (Mazviona) | SHONA | Mazviona, Muchena, Chikonan'ombe, Dhliwayo | Maita Beta, Mazviona. | Ishwa inobuda mumwena une mvura. | Winged harvester termites |
| Tsiwo/Gushungo | SHONA | Gushungo, Mukanya, Zvimba | Maita Gushungo, vari muZvimba. | Gushungo rinoruma nenzara. | Albino / white-spotted game |
| Shiri/Hungwe | SHONA | Hungwe, Nyajena, Chirongamabwe, Nyoni, Chasura, Mawuruka | Maita Hungwe, Shiri yomudenga. | Shiri inovururuka nemapapiro ayo. | Fish eagle |
| Mbeva (Mouse) | SHONA | Zungunde, Mukundwa, Tovakare, Warerwa | — | — | Mouse |
| Mhara (Antelope/Impala) | SHONA | Chikonan'ombe | — | — | Impala |
| Nkomo (Cattle) | SHONA | Mupamombe | — | — | Cattle |
| Mheta | SHONA | Saunyama | — | — | — |
| Bepe (Lung) | SHONA | — | — | — | Lung |
| Chuma (Tortoise) | SHONA | Machuma, Kota, Gumbi | — | — | Tortoise |
| Nhewa/Ingwe (Leopard) | SHONA | Simboti | — | — | Leopard |
| Nhire/Gwizo (Spring Hare) | SHONA | Mugombi, Matutu, Muwariwa, Vhenya | — | — | Spring hare |
| Shato (Python) | SHONA | — | — | — | Python |
| Twiza/Ndudza (Giraffe) | SHONA | Nondo | — | — | Giraffe |

---

## 6. Ndebele Clan Registry (Izibongo) — Full Entries

| Totem Key (in app) | System | Izithakazelo | Greeting | Proverb | Taboo |
|--------------------|--------|-------------|----------|---------|-------|
| Khumalo | NDEBELE | Mntungwa, Lobengula, Mzilikazi, Zwide | Bayethe Mntungwa, Khumalo! | Imbila yaswela umsila ngokuyalezela. | Royal game / Eland |
| Sibanda | NDEBELE | Shumba, Thambo, Gwaza, Ncindela | Ngiabonga Sibanda, lina bakwaChibi. | Inkunzi isematholeni. | Lion meat / claws |
| Dube | NDEBELE | Zephania, Mpunzi, Mbizi, Khanye | Dube, Mbombela, lina elimitshatshazi. | Kakho mfula ungabo gubha. | Zebra |
| Ndlovu | NDEBELE | Gatsheni, Boyikazi, Mpofu, Msopho | Gatsheni, lina elisenga inkomo zokusisela. | Indlovu ayisindwa ngumbhoko wayo. | Elephant meat and tusks |
| Ncube | NDEBELE | Mzilankatha, Phathokoza, Ntabeni | Ncube, lina elikhwela emithini. | Indlela ibuzwa kwabaphambili. | Monkey / Baboon |
| Ngwenya | NDEBELE | Mambo, Mtimande, Libazi, Malandela | Ngwenya, lina elihlala emanzini amanyama. | Izandla sihlamba esinye. | Crocodile |

---

## 7. Proverbs Library (Tsumo / Izaga) — Shona

All proverbs from `lookups.js:93-113`, organized by category.

### 7.1 Family & Kinship (Mhuri neNzanga)

| Shona | Literal Translation | Cultural Meaning |
|-------|-------------------|-----------------|
| Chara chimwe hachitswanyi hinda. | One thumb cannot crush a louse. | Unity is strength. No one stands alone without their lineage. |
| Rume rimwe harikambi pfurwa. | One man cannot surround an elephant. | Complex problems require collective family effort. |
| Nhowo yemwana ndiyo iri mumaoko aamai. | The child's safe resting place is in the mother's hands. | Celebrates maternal security and foundational lineage. |
| Kandiro kanoenda kunobva kamwe. | A small dish goes to where another small dish comes from. | Reciprocity; community thrives on mutual family gift exchanges. |
| Kugara nhaka huona dzevamwe. | To inherit successfully is to observe how others did it. | Respect historical precedent; learn from ancestral patterns. |
| Mwana washe muranda kumwe. | A chief's child is a servant in another territory. | Humility; outside your family ecosystem, earn respect on merit. |
| Musha mukadzi. | A home is defined by the presence of a woman. | Recognises women/mothers as anchors of household stability. |

### 7.2 Wisdom & Elders (Zivo neChiremerera)

| Shona | Literal Translation | Cultural Meaning |
|-------|-------------------|-----------------|
| Ndambakuudzwa akaonekwa nembonje pamhanza. | The one who refused advice got a permanent scar on the forehead. | Disregarding ancestral/parental wisdom leads to preventable scars. |
| Gungwo rakaramba revana richiti mafuta ari mberi. | The crow rejected its chicks, claiming better ones ahead. | Do not abandon your family roots for speculative fortunes. |
| Kure kwegava ndokusina musungusungu. | The only place far for a jackal is where there are no wild berries. | People travel any distance to reconnect with what they love (home/lineage). |
| Mviromviro dzembanje dzinotanga nemashizha. | Wild smoking starts simply with the leaves. | Major disputes trace back to small unaddressed roots. |
| Pasi pomoto pane madota. | Beneath the fire lies quiet ash. | Great wisdom often hides beneath an unassuming exterior. |
| Zano ndega akasiya jira mumvura. | The know-it-all left his blanket soaking in the river. | Isolationism causes failure; relying solely on own intellect leads to loss. |

### 7.3 Time & Consequence (Nguva neMhedzisiro)

| Shona | Literal Translation | Cultural Meaning |
|-------|-------------------|-----------------|
| Mhosva hairovi. | A crime never rots/ fades with time. | Accountability; ancestral responsibilities must eventually be settled. |
| Aiva madziva ava mazambuko. | Deep pools became shallow crossing points. | Change is inevitable; family empires shift, landscapes evolve. |
| Chura kugara mumvura haasi hove. | A frog living in water is not a fish. | Proximity ≠ identity; true lineage is rooted in Mutupo, not location. |
| Gonzo kugarisa mumatsire rinoti ndava muna mambo. | A rat in the granary fancies itself a king. | Warning against unearned complacency from temporary privilege. |
| Kupfuma kune zvacho, kurova imbwa nemukaka. | Wealth brings strange habits, like beating a dog with milk. | Structural prosperity can alter behaviour in eccentric ways. |
| Sabhuku ndiye musimboti wemusha. | The village head is the true pillar of the village. | Without the Sabhuku, local admin data lacks its structural anchor. |

---

## 8. Ethnic / Language Groups & Dialect Clusters

| Term | Cluster | Region | Notes |
|------|---------|--------|-------|
| **Zezuru** | Shona Dialect Tree | Harare, Mashonaland Central/East/West | Baseline for standard written Shona |
| **Karanga** | Shona Dialect Tree | Masvingo, Midlands | Largest Shona dialect cluster |
| **Manyika** | Shona Dialect Tree | Manicaland (Eastern Highlands) | Unique vocal intonations |
| **Korekore** | Shona Dialect Tree | Northern Mashonaland Central/West, Zambezi Valley | |
| **Ndau** | Shona Dialect Tree | Chipinge, Chimanimani (southeast Manicaland) | Influenced by Nguni migrations |
| **Ndebele** | Nguni Dialect Tree | Matabeleland North/South, Bulawayo | 19th-century Khumalo migration from Zulu kingdom |
| **Kalanga** | Nguni Dialect Tree | Bulilima, Mangwe (western Matabeleland) | Predates Ndebele arrival |
| **Tonga** | Zambezi & Border Tree | Binga district, Zambezi Valley | Matrilineal descent system (Mukowa) |
| **Venda** | Zambezi & Border Tree | Beitbridge (southern border) | |
| **Shangani** (Tsonga) | Zambezi & Border Tree | Chiredzi (southeastern lowveld) | |
| **Sotho** | Sotho-Tswana Tree | Southwestern Matabeleland South | |
| **Tswana** | Sotho-Tswana Tree | Pockets in Matabeleland | |
| **Sena** | Zambezi & Border Tree | Northern/eastern border zones | |
| **Chewa** | Zambezi & Border Tree | Eastern border zones | |
| **Chibarwe** | Zambezi & Border Tree | Eastern border zones | |
| **Nambya** | Zambezi & Border Tree | Northwestern Zimbabwe | |
| **Tshwa San** (Koisan) | Zambezi & Border Tree | Tsholotsho, Bulalima-Mangwe | Indigenous San click-language speakers |
| **Doma/Vadema** | Zambezi & Border Tree | Kanyemba, Mbire (Zambezi Valley) | Hunter-gatherer community |
| **Xhosa** | Zambezi & Border Tree | Bulawayo, Matabeleland South pockets | Nguni language, distinct click consonants |
| **Birwa** | Sotho-Tswana Tree | Minor group | |
| **Barwe** | (Unclassified) | Eastern border zones | |

---

## 9. Provinces of Zimbabwe

| Province | Notes |
|----------|-------|
| Bulawayo | Metropolitan province |
| Harare | Metropolitan province / capital |
| Manicaland | Eastern highlands, Manyika/Ndau dominant |
| Mashonaland Central | Zezuru/Korekore dominant |
| Mashonaland East | Zezuru dominant |
| Mashonaland West | Zezuru/Korekore dominant |
| Masvingo | Karanga dominant; Great Zimbabwe |
| Matabeleland North | Ndebele/Kalanga dominant; Victoria Falls |
| Matabeleland South | Ndebele/Kalanga/Sotho dominant; Beitbridge |
| Midlands | Mixed Shona/Ndebele; Karanga dominant |

---

## 10. App-Internal Technical Terms

These are application-level identifiers not from any spoken language, but named after customary concepts:

| Term | Source | Purpose |
|------|--------|---------|
| `houseRank` | `data.js:324` | Integer rank for polygamous wife order (1 = Amai Guru) |
| `lifecycleState` | `data.js:336` | State machine tracking deceased node progression |
| `customaryLineageOverrideId` | `data.js:325` | Manual override for Ngozi/Kumutsa Mapfihwa cases |
| `versionSequence` | `data.js:338` | Vector clock counter for offline P2P sync conflict resolution |
| `_disputed` | `app.js` | Flag set when sync conflict cannot be auto-resolved |
| `MUTUPO_VEKUBEREKANA` | `customary.js:14` | Error code for exogamy violation (matching totem + praise name) |
| `ROOTS_V1` | `customary.js:140` | Header token for WhatsApp text-snippet sync payload |
| `computeNextInLine()` | `customary.js:176` | Chieftainship collateral succession algorithm |
| `validateMarriageFeasibility()` | `customary.js:7` | Exogamy check enforcing totem-based marriage prohibition |
| `inheritLineage()` | `customary.js:20` | Patrilineal default vs. Tonga matrilineal inheritance |
| `resolveChildTotem()` | `customary.js:42` | Out-of-wedlock totem drift resolution |
| `sortByHouseSeniority()` | `customary.js:62` | Polygamous house ranking by marriage order |
| `calculateConsanguinityDistance()` | `customary.js:93` | BFS kinship distance for timeline privacy scoping |
| `generateWhatsAppPayload()` | `customary.js:136` | Generates compressed text-snippet for WhatsApp sync |
| `transitionLifecycleState()` | `customary.js:279` | Validates state machine transitions for deceased nodes |

---

## 11. Marriage Phase Terms (App UI Labels)

| Phase ID (in app) | Display Label | Cultural System |
|-------------------|---------------|-----------------|
| `kubvunza` | Kubvunza / Ukucela | SHONA / NDEBELE |
| `kuzivisa` | Kuzivisa / Ukwazisa | SHONA / NDEBELE |
| `negotiation` | Roora Negotiation (Dare) | SHONA |
| `rusambo` | Rusambo / Isu (Token) | SHONA / NDEBELE |
| `mombe_humai` | Mombe yeHumai / Inkomo kaMama | SHONA / NDEBELE |
| `maputiro` | Maputiro / Ukuyala | SHONA / NDEBELE |
| `chiredzwa` | Chiredzwa / Isu lokugcina | SHONA / NDEBELE |
| `mbudzi` | Mbudzi / Imbuzi (Goat) | SHONA / NDEBELE |
| `kupinza` | Kupinza / Ukungenisa | SHONA / NDEBELE |

---

## 12. Funeral Phase Terms (App UI Labels)

| Phase ID (in app) | Display Label | Purpose |
|-------------------|---------------|---------|
| `notify_family` | Notify immediate family | First notification circle |
| `notify_extended` | Notify extended relatives | Extended family alert |
| `notify_community` | Notify community / church | Community-wide notification |
| `burial_arrangements` | Burial arrangements | Logistical planning |
| `funeral_service` | Funeral service held | The service itself |
| `mourning_period` | Mourning period observed | Grieving window |
| `kuchenura` | Kuchenura (cleansing ceremony) | Ritual purification phase |
| `kubvisa` | Kubvisa (removal of mourning attire) | End of formal mourning |
| `kugadza` | Kugadza (installation of heir) | Heir installation ceremony |
| `nhaka_reading` | Nhaka reading (will/estate declaration) | Estate and will reading |
| `inventory_assets` | Inventory assets | Asset listing |
| `identify_heirs` | Identify rightful heirs | Heir determination |
| `assign_executor` | Assign executor | Executor appointment |
| `distribute_estate` | Distribute estate | Asset distribution |
| `close_estate` | Close estate (Nhaka resolved) | Final estate closure |

---

*Generated from the Roots project source files — all non-English terms preserved verbatim from source data. No fabricated cultural content.*
