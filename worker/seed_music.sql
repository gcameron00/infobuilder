-- Music store seed — New Order and connected artists
-- Idempotent via INSERT OR IGNORE — safe to re-run.
--
-- ID namespace: 01900000-0001-XXXX-YYYY-ZZZZZZZZZZZZ
--   0000 = store          0001 = entity types     0002 = rel types
--   0003 = field defs     0010 = bands            0011 = people
--   0012 = albums         0013 = labels           0020 = relationships
--
-- Entity types  1=Band  2=Person  3=Album  4=Label
-- Rel types     1=MemberOf  2=Released  3=OriginatedFrom  4=RelatedBand  5=SignedTo

-- ─────────────────────────────────────────────────────────────────────────────
-- Store
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO stores (id, name, description) VALUES
  ('01900000-0001-0000-0000-000000000001',
   'Music',
   'Bands, members, and albums — centred on New Order and connected artists.');

-- ─────────────────────────────────────────────────────────────────────────────
-- Entity types
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO entity_types (id, store_id, name, display_name) VALUES
  ('01900000-0001-0001-0000-000000000001', '01900000-0001-0000-0000-000000000001', 'band',   'Band'),
  ('01900000-0001-0001-0000-000000000002', '01900000-0001-0000-0000-000000000001', 'person', 'Person'),
  ('01900000-0001-0001-0000-000000000003', '01900000-0001-0000-0000-000000000001', 'album',  'Album'),
  ('01900000-0001-0001-0000-000000000004', '01900000-0001-0000-0000-000000000001', 'label',  'Label');

-- ─────────────────────────────────────────────────────────────────────────────
-- Relationship types
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO relationship_types
  (id, store_id, name, source_entity_type_id, target_entity_type_id, inverse_label, directed)
VALUES
  -- Person → Band
  ('01900000-0001-0002-0000-000000000001', '01900000-0001-0000-0000-000000000001',
   'MemberOf',
   '01900000-0001-0001-0000-000000000002',
   '01900000-0001-0001-0000-000000000001',
   'HasMember', 1),
  -- Band → Album
  ('01900000-0001-0002-0000-000000000002', '01900000-0001-0000-0000-000000000001',
   'Released',
   '01900000-0001-0001-0000-000000000001',
   '01900000-0001-0001-0000-000000000003',
   'ReleasedBy', 1),
  -- Band → Band (directed: "X originated from Y")
  ('01900000-0001-0002-0000-000000000003', '01900000-0001-0000-0000-000000000001',
   'OriginatedFrom',
   '01900000-0001-0001-0000-000000000001',
   '01900000-0001-0001-0000-000000000001',
   'SpawnedBand', 1),
  -- Band ↔ Band (undirected: shared members / related outfits)
  ('01900000-0001-0002-0000-000000000004', '01900000-0001-0000-0000-000000000001',
   'RelatedBand',
   '01900000-0001-0001-0000-000000000001',
   '01900000-0001-0001-0000-000000000001',
   NULL, 0),
  -- Band → Label
  ('01900000-0001-0002-0000-000000000005', '01900000-0001-0000-0000-000000000001',
   'SignedTo',
   '01900000-0001-0001-0000-000000000001',
   '01900000-0001-0001-0000-000000000004',
   'SignedArtist', 1);

-- ─────────────────────────────────────────────────────────────────────────────
-- Field definitions — Band
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO field_definitions
  (id, parent_type, parent_type_id, name, data_type, required, display_order)
VALUES
  ('01900000-0001-0003-0001-000000000001', 'entity_type', '01900000-0001-0001-0000-000000000001', 'name',           'string', 1, 0),
  ('01900000-0001-0003-0001-000000000002', 'entity_type', '01900000-0001-0001-0000-000000000001', 'formed_year',    'string', 0, 1),
  ('01900000-0001-0003-0001-000000000003', 'entity_type', '01900000-0001-0001-0000-000000000001', 'disbanded_year', 'string', 0, 2),
  ('01900000-0001-0003-0001-000000000004', 'entity_type', '01900000-0001-0001-0000-000000000001', 'origin',         'string', 0, 3),
  ('01900000-0001-0003-0001-000000000005', 'entity_type', '01900000-0001-0001-0000-000000000001', 'genres',         'string', 0, 4),
  ('01900000-0001-0003-0001-000000000006', 'entity_type', '01900000-0001-0001-0000-000000000001', 'description',    'text',   0, 5);

-- ─────────────────────────────────────────────────────────────────────────────
-- Field definitions — Person
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO field_definitions
  (id, parent_type, parent_type_id, name, data_type, required, display_order)
VALUES
  ('01900000-0001-0003-0002-000000000001', 'entity_type', '01900000-0001-0001-0000-000000000002', 'name',        'string', 1, 0),
  ('01900000-0001-0003-0002-000000000002', 'entity_type', '01900000-0001-0001-0000-000000000002', 'born_year',   'string', 0, 1),
  ('01900000-0001-0003-0002-000000000003', 'entity_type', '01900000-0001-0001-0000-000000000002', 'died_year',   'string', 0, 2),
  ('01900000-0001-0003-0002-000000000004', 'entity_type', '01900000-0001-0001-0000-000000000002', 'nationality', 'string', 0, 3),
  ('01900000-0001-0003-0002-000000000005', 'entity_type', '01900000-0001-0001-0000-000000000002', 'instruments', 'string', 0, 4),
  ('01900000-0001-0003-0002-000000000006', 'entity_type', '01900000-0001-0001-0000-000000000002', 'description', 'text',   0, 5);

-- ─────────────────────────────────────────────────────────────────────────────
-- Field definitions — Album
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO field_definitions
  (id, parent_type, parent_type_id, name, data_type, required, display_order)
VALUES
  ('01900000-0001-0003-0003-000000000001', 'entity_type', '01900000-0001-0001-0000-000000000003', 'title',        'string', 1, 0),
  ('01900000-0001-0003-0003-000000000002', 'entity_type', '01900000-0001-0001-0000-000000000003', 'release_year', 'string', 1, 1),
  ('01900000-0001-0003-0003-000000000003', 'entity_type', '01900000-0001-0001-0000-000000000003', 'label',        'string', 0, 2),
  ('01900000-0001-0003-0003-000000000004', 'entity_type', '01900000-0001-0001-0000-000000000003', 'genres',       'string', 0, 3),
  ('01900000-0001-0003-0003-000000000005', 'entity_type', '01900000-0001-0001-0000-000000000003', 'description',  'text',   0, 4);

-- ─────────────────────────────────────────────────────────────────────────────
-- Field definitions — Label
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO field_definitions
  (id, parent_type, parent_type_id, name, data_type, required, display_order)
VALUES
  ('01900000-0001-0003-0004-000000000001', 'entity_type', '01900000-0001-0001-0000-000000000004', 'name',         'string', 1, 0),
  ('01900000-0001-0003-0004-000000000002', 'entity_type', '01900000-0001-0001-0000-000000000004', 'founded_year', 'string', 0, 1),
  ('01900000-0001-0003-0004-000000000003', 'entity_type', '01900000-0001-0001-0000-000000000004', 'country',      'string', 0, 2),
  ('01900000-0001-0003-0004-000000000004', 'entity_type', '01900000-0001-0001-0000-000000000004', 'description',  'text',   0, 3);

-- ─────────────────────────────────────────────────────────────────────────────
-- Field definitions — MemberOf relationship
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO field_definitions
  (id, parent_type, parent_type_id, name, data_type, required, display_order)
VALUES
  ('01900000-0001-0003-0011-000000000001', 'relationship_type', '01900000-0001-0002-0000-000000000001', 'instrument', 'string', 0, 0),
  ('01900000-0001-0003-0011-000000000002', 'relationship_type', '01900000-0001-0002-0000-000000000001', 'start_year', 'string', 0, 1),
  ('01900000-0001-0003-0011-000000000003', 'relationship_type', '01900000-0001-0002-0000-000000000001', 'end_year',   'string', 0, 2);

-- ─────────────────────────────────────────────────────────────────────────────
-- Field definitions — OriginatedFrom relationship
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO field_definitions
  (id, parent_type, parent_type_id, name, data_type, required, display_order)
VALUES
  ('01900000-0001-0003-0013-000000000001', 'relationship_type', '01900000-0001-0002-0000-000000000003', 'year',  'string', 0, 0),
  ('01900000-0001-0003-0013-000000000002', 'relationship_type', '01900000-0001-0002-0000-000000000003', 'notes', 'text',   0, 1);

-- ─────────────────────────────────────────────────────────────────────────────
-- Field definitions — RelatedBand relationship
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO field_definitions
  (id, parent_type, parent_type_id, name, data_type, required, display_order)
VALUES
  ('01900000-0001-0003-0014-000000000001', 'relationship_type', '01900000-0001-0002-0000-000000000004', 'context', 'string', 0, 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- Field definitions — SignedTo relationship
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO field_definitions
  (id, parent_type, parent_type_id, name, data_type, required, display_order)
VALUES
  ('01900000-0001-0003-0015-000000000001', 'relationship_type', '01900000-0001-0002-0000-000000000005', 'start_year', 'string', 0, 0),
  ('01900000-0001-0003-0015-000000000002', 'relationship_type', '01900000-0001-0002-0000-000000000005', 'end_year',   'string', 0, 1);

-- ─────────────────────────────────────────────────────────────────────────────
-- Entities — Bands
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO entities (id, entity_type_id, field_values) VALUES
  ('01900000-0001-0010-0000-000000000001',
   '01900000-0001-0001-0000-000000000001',
   '{"name":"New Order","formed_year":"1980","origin":"Salford, Manchester, England","genres":"Post-punk, synth-pop, new wave, dance","description":"Formed in 1980 from Joy Division after the death of Ian Curtis. Pioneered the fusion of post-punk guitar with electronic dance music and became one of the best-selling bands of the 1980s."}'),

  ('01900000-0001-0010-0000-000000000002',
   '01900000-0001-0001-0000-000000000001',
   '{"name":"Joy Division","formed_year":"1976","disbanded_year":"1980","origin":"Salford, Manchester, England","genres":"Post-punk, gothic rock, dark wave","description":"Seminal Manchester post-punk band active 1976-1980. Disbanded following the death of vocalist Ian Curtis on the eve of their first North American tour."}'),

  ('01900000-0001-0010-0000-000000000003',
   '01900000-0001-0001-0000-000000000001',
   '{"name":"Electronic","formed_year":"1987","disbanded_year":"2001","origin":"Manchester, England","genres":"Synth-pop, new wave, alternative dance","description":"Side project of Bernard Sumner (New Order) and Johnny Marr (The Smiths), with occasional contributions from Neil Tennant of Pet Shop Boys. Released three studio albums."}'),

  ('01900000-0001-0010-0000-000000000004',
   '01900000-0001-0001-0000-000000000001',
   '{"name":"The Smiths","formed_year":"1982","disbanded_year":"1987","origin":"Manchester, England","genres":"Indie rock, post-punk, jangle pop","description":"Iconic Manchester indie band formed by Morrissey and Johnny Marr. Widely regarded as one of the most influential bands of the 1980s."}'),

  ('01900000-0001-0010-0000-000000000005',
   '01900000-0001-0001-0000-000000000001',
   '{"name":"The Other Two","formed_year":"1990","disbanded_year":"2004","origin":"Manchester, England","genres":"Electronic, synth-pop, house","description":"Side project of New Order members Stephen Morris and Gillian Gilbert. Released two studio albums between 1993 and 1999."}'),

  ('01900000-0001-0010-0000-000000000006',
   '01900000-0001-0001-0000-000000000001',
   '{"name":"Monaco","formed_year":"1995","disbanded_year":"1999","origin":"Manchester, England","genres":"Alternative rock, Britpop","description":"Band formed by Peter Hook and New Order crew member David Potts while New Order was on hiatus during the mid-1990s."}'),

  ('01900000-0001-0010-0000-000000000007',
   '01900000-0001-0001-0000-000000000001',
   '{"name":"Bad Lieutenant","formed_year":"2008","origin":"Manchester, England","genres":"Post-punk, indie rock, electronic","description":"Band formed by Bernard Sumner and Phil Cunningham during New Order hiatus following the departure of Peter Hook. Released one album, Never Cry Another Tear (2009)."}'),

  ('01900000-0001-0010-0000-000000000008',
   '01900000-0001-0001-0000-000000000001',
   '{"name":"Revenge","formed_year":"1989","disbanded_year":"1993","origin":"Manchester, England","genres":"Alternative rock, indie rock","description":"Band formed by Peter Hook during New Order first extended hiatus. Released one studio album, One True Passion (1990)."}');

-- ─────────────────────────────────────────────────────────────────────────────
-- Entities — People
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO entities (id, entity_type_id, field_values) VALUES
  ('01900000-0001-0011-0000-000000000001',
   '01900000-0001-0001-0000-000000000002',
   '{"name":"Bernard Sumner","born_year":"1956","nationality":"British","instruments":"Vocals, guitar, keyboards","description":"Co-founder of Joy Division and New Order. Also formed Electronic with Johnny Marr and Bad Lieutenant with Phil Cunningham. Born Bernard Dicken in Salford."}'),

  ('01900000-0001-0011-0000-000000000002',
   '01900000-0001-0001-0000-000000000002',
   '{"name":"Peter Hook","born_year":"1956","nationality":"British","instruments":"Bass guitar","description":"Co-founder of Joy Division and New Order, known for melodic bass lines played high on the neck. Left New Order in 2007 and subsequently formed Peter Hook and The Light."}'),

  ('01900000-0001-0011-0000-000000000003',
   '01900000-0001-0001-0000-000000000002',
   '{"name":"Stephen Morris","born_year":"1957","nationality":"British","instruments":"Drums, percussion, drum machines","description":"Drummer and percussionist for Joy Division and New Order. Formed The Other Two with his partner Gillian Gilbert."}'),

  ('01900000-0001-0011-0000-000000000004',
   '01900000-0001-0001-0000-000000000002',
   '{"name":"Gillian Gilbert","born_year":"1961","nationality":"British","instruments":"Keyboards, guitar","description":"Keyboardist of New Order, joining shortly after the band formed in 1980. Partner of Stephen Morris; together they form The Other Two."}'),

  ('01900000-0001-0011-0000-000000000005',
   '01900000-0001-0001-0000-000000000002',
   '{"name":"Ian Curtis","born_year":"1956","died_year":"1980","nationality":"British","instruments":"Vocals, guitar","description":"Vocalist and lyricist of Joy Division. His death by suicide on 18 May 1980 led the three surviving members to reform as New Order."}'),

  ('01900000-0001-0011-0000-000000000006',
   '01900000-0001-0001-0000-000000000002',
   '{"name":"Johnny Marr","born_year":"1963","nationality":"British","instruments":"Guitar","description":"Guitarist and co-founder of The Smiths. Founded Electronic with Bernard Sumner. Has subsequently had an extensive solo career and collaborated widely."}'),

  ('01900000-0001-0011-0000-000000000007',
   '01900000-0001-0001-0000-000000000002',
   '{"name":"Phil Cunningham","born_year":"1965","nationality":"British","instruments":"Guitar, keyboards","description":"Joined New Order in 2001, initially as a replacement for Gillian Gilbert. Also a founding member of Bad Lieutenant alongside Bernard Sumner."}'),

  ('01900000-0001-0011-0000-000000000008',
   '01900000-0001-0001-0000-000000000002',
   '{"name":"David Potts","born_year":"1961","nationality":"British","instruments":"Guitar, vocals","description":"New Order crew member and guitarist who co-founded Monaco with Peter Hook during New Order hiatus in the mid-1990s."}');

-- ─────────────────────────────────────────────────────────────────────────────
-- Entities — Albums
-- ─────────────────────────────────────────────────────────────────────────────
-- Joy Division
INSERT OR IGNORE INTO entities (id, entity_type_id, field_values) VALUES
  ('01900000-0001-0012-0000-000000000001',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Unknown Pleasures","release_year":"1979","label":"Factory Records","genres":"Post-punk, gothic rock, dark wave","description":"Debut studio album by Joy Division. Produced by Martin Hannett, its sparse, atmospheric sound defined the post-punk genre."}'),

  ('01900000-0001-0012-0000-000000000002',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Closer","release_year":"1980","label":"Factory Records","genres":"Post-punk, dark wave, gothic rock","description":"Second and final studio album by Joy Division, released two months after Ian Curtis death. Often considered one of the greatest albums ever made."}');

-- New Order
INSERT OR IGNORE INTO entities (id, entity_type_id, field_values) VALUES
  ('01900000-0001-0012-0000-000000000003',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Movement","release_year":"1981","label":"Factory Records","genres":"Post-punk, new wave","description":"Debut album by New Order, recorded before the band had fully settled on their electronic direction. Retains a strong Joy Division influence."}'),

  ('01900000-0001-0012-0000-000000000004',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Power, Corruption & Lies","release_year":"1983","label":"Factory Records","genres":"Synth-pop, post-punk, dance","description":"Second studio album. The standalone single Blue Monday, released the same year, became the best-selling 12-inch single of all time."}'),

  ('01900000-0001-0012-0000-000000000005',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Low-life","release_year":"1985","label":"Factory Records","genres":"Synth-pop, post-punk, dance","description":"Third studio album, widely regarded as the point where New Order fully synthesised post-punk guitar with electronic dance music."}'),

  ('01900000-0001-0012-0000-000000000006',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Brotherhood","release_year":"1986","label":"Factory Records","genres":"Alternative rock, synth-pop","description":"Fourth studio album, split roughly between guitar-led songs on side one and electronic tracks on side two."}'),

  ('01900000-0001-0012-0000-000000000007',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Technique","release_year":"1989","label":"Factory Records","genres":"Synth-pop, Madchester, acid house","description":"Fifth studio album, recorded partly in Ibiza during the acid house explosion. Debuted at number one in the UK."}'),

  ('01900000-0001-0012-0000-000000000008',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Republic","release_year":"1993","label":"London Records","genres":"Electronic, dance, synth-pop","description":"Sixth studio album, released on London Records after Factory Records went bankrupt. Debuted at number one in the UK."}'),

  ('01900000-0001-0012-0000-000000000009',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Get Ready","release_year":"2001","label":"London Records","genres":"Alternative rock, electronic","description":"Seventh studio album, featuring guest appearances from Bobby Gillespie and Billy Corgan. A more guitar-driven return."}'),

  ('01900000-0001-0012-0000-000000000010',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Music Complete","release_year":"2015","label":"Mute Records","genres":"Electronic, dance, synth-pop","description":"Ninth studio album and first without Peter Hook. Produced by various collaborators including Stuart Price, widely praised as a late-career high point."}');

-- Electronic
INSERT OR IGNORE INTO entities (id, entity_type_id, field_values) VALUES
  ('01900000-0001-0012-0000-000000000011',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Electronic","release_year":"1991","label":"Parlophone","genres":"Synth-pop, new wave, alternative dance","description":"Self-titled debut album by Electronic, featuring contributions from Neil Tennant (Pet Shop Boys) on several tracks."}'),

  ('01900000-0001-0012-0000-000000000012',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Raise the Pressure","release_year":"1996","label":"Parlophone","genres":"Alternative dance, synth-pop","description":"Second studio album by Electronic. More straightforward in production than the debut, co-produced by Karl Bartos of Kraftwerk."}'),

  ('01900000-0001-0012-0000-000000000013',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Twisted Tenderness","release_year":"1999","label":"Parlophone","genres":"Alternative rock, electronic","description":"Third and final album by Electronic. The band dissolved shortly after its release."}');

-- The Smiths
INSERT OR IGNORE INTO entities (id, entity_type_id, field_values) VALUES
  ('01900000-0001-0012-0000-000000000014',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"The Smiths","release_year":"1984","label":"Rough Trade Records","genres":"Indie rock, post-punk, jangle pop","description":"Self-titled debut album by The Smiths. Produced by John Porter and Troy Tate. Launched one of the most distinctive voices in British indie music."}'),

  ('01900000-0001-0012-0000-000000000015',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Meat Is Murder","release_year":"1985","label":"Rough Trade Records","genres":"Indie rock, post-punk","description":"Second studio album by The Smiths. Debuted at number one in the UK and features the landmark title track."}'),

  ('01900000-0001-0012-0000-000000000016',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"The Queen Is Dead","release_year":"1986","label":"Rough Trade Records","genres":"Indie rock, post-punk, jangle pop","description":"Third studio album by The Smiths. Consistently ranked among the greatest albums of all time."}'),

  ('01900000-0001-0012-0000-000000000017',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Strangeways, Here We Come","release_year":"1987","label":"Rough Trade Records","genres":"Indie rock, post-punk","description":"Fourth and final studio album by The Smiths, released after the band had already broken up. More polished and orchestral than previous releases."}');

-- The Other Two
INSERT OR IGNORE INTO entities (id, entity_type_id, field_values) VALUES
  ('01900000-0001-0012-0000-000000000018',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"The Other Two & You","release_year":"1993","label":"London Records","genres":"Electronic, synth-pop, house","description":"Debut album by The Other Two (Stephen Morris and Gillian Gilbert), recorded alongside the New Order Republic sessions."}');

-- Monaco
INSERT OR IGNORE INTO entities (id, entity_type_id, field_values) VALUES
  ('01900000-0001-0012-0000-000000000019',
   '01900000-0001-0001-0000-000000000003',
   '{"title":"Music for Pleasure","release_year":"1997","label":"Polydor","genres":"Alternative rock, Britpop","description":"Debut and only studio album by Monaco, recorded by Peter Hook and David Potts while New Order was on indefinite hiatus."}');

-- ─────────────────────────────────────────────────────────────────────────────
-- Entities — Labels
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO entities (id, entity_type_id, field_values) VALUES
  ('01900000-0001-0013-0000-000000000001',
   '01900000-0001-0001-0000-000000000004',
   '{"name":"Factory Records","founded_year":"1978","country":"United Kingdom","description":"Iconic Manchester independent label founded by Tony Wilson and Alan Erasmus. Home to Joy Division, New Order, The Durutti Column, Happy Mondays, and many others. Went bankrupt in 1992."}'),

  ('01900000-0001-0013-0000-000000000002',
   '01900000-0001-0001-0000-000000000004',
   '{"name":"London Records","founded_year":"1947","country":"United Kingdom","description":"Major UK label that signed New Order and The Other Two after Factory Records collapsed. Part of PolyGram and later Warner Music."}'),

  ('01900000-0001-0013-0000-000000000003',
   '01900000-0001-0001-0000-000000000004',
   '{"name":"Rough Trade Records","founded_year":"1978","country":"United Kingdom","description":"Independent UK label founded by Geoff Travis. Home to The Smiths, The Strokes, Arcade Fire, and many others."}'),

  ('01900000-0001-0013-0000-000000000004',
   '01900000-0001-0001-0000-000000000004',
   '{"name":"Parlophone","founded_year":"1923","country":"United Kingdom","description":"Historic UK label, part of EMI. Home to Electronic, Radiohead, Coldplay, and many major acts. Acquired by Warner Music Group in 2013."}');

-- ─────────────────────────────────────────────────────────────────────────────
-- Relationships — MemberOf  (Person → Band)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO relationships
  (id, relationship_type_id, source_entity_id, target_entity_id, field_values)
VALUES
  -- Bernard Sumner
  ('01900000-0001-0020-0000-000000000001',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000001', -- Bernard Sumner
   '01900000-0001-0010-0000-000000000002', -- Joy Division
   '{"instrument":"Guitar, vocals","start_year":"1976","end_year":"1980"}'),

  ('01900000-0001-0020-0000-000000000002',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000001', -- Bernard Sumner
   '01900000-0001-0010-0000-000000000001', -- New Order
   '{"instrument":"Vocals, guitar, keyboards","start_year":"1980"}'),

  ('01900000-0001-0020-0000-000000000003',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000001', -- Bernard Sumner
   '01900000-0001-0010-0000-000000000003', -- Electronic
   '{"instrument":"Vocals, guitar, keyboards","start_year":"1987","end_year":"2001"}'),

  ('01900000-0001-0020-0000-000000000004',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000001', -- Bernard Sumner
   '01900000-0001-0010-0000-000000000007', -- Bad Lieutenant
   '{"instrument":"Vocals, guitar, keyboards","start_year":"2008"}'),

  -- Peter Hook
  ('01900000-0001-0020-0000-000000000005',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000002', -- Peter Hook
   '01900000-0001-0010-0000-000000000002', -- Joy Division
   '{"instrument":"Bass guitar","start_year":"1976","end_year":"1980"}'),

  ('01900000-0001-0020-0000-000000000006',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000002', -- Peter Hook
   '01900000-0001-0010-0000-000000000001', -- New Order
   '{"instrument":"Bass guitar","start_year":"1980","end_year":"2007"}'),

  ('01900000-0001-0020-0000-000000000007',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000002', -- Peter Hook
   '01900000-0001-0010-0000-000000000006', -- Monaco
   '{"instrument":"Bass guitar, vocals","start_year":"1995","end_year":"1999"}'),

  ('01900000-0001-0020-0000-000000000008',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000002', -- Peter Hook
   '01900000-0001-0010-0000-000000000008', -- Revenge
   '{"instrument":"Bass guitar, vocals","start_year":"1989","end_year":"1993"}'),

  -- Stephen Morris
  ('01900000-0001-0020-0000-000000000009',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000003', -- Stephen Morris
   '01900000-0001-0010-0000-000000000002', -- Joy Division
   '{"instrument":"Drums","start_year":"1977","end_year":"1980"}'),

  ('01900000-0001-0020-0000-000000000010',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000003', -- Stephen Morris
   '01900000-0001-0010-0000-000000000001', -- New Order
   '{"instrument":"Drums, drum machines","start_year":"1980"}'),

  ('01900000-0001-0020-0000-000000000011',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000003', -- Stephen Morris
   '01900000-0001-0010-0000-000000000005', -- The Other Two
   '{"instrument":"Drums, programming","start_year":"1990"}'),

  -- Gillian Gilbert
  ('01900000-0001-0020-0000-000000000012',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000004', -- Gillian Gilbert
   '01900000-0001-0010-0000-000000000001', -- New Order
   '{"instrument":"Keyboards, guitar","start_year":"1980"}'),

  ('01900000-0001-0020-0000-000000000013',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000004', -- Gillian Gilbert
   '01900000-0001-0010-0000-000000000005', -- The Other Two
   '{"instrument":"Keyboards, guitar","start_year":"1990"}'),

  -- Ian Curtis
  ('01900000-0001-0020-0000-000000000014',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000005', -- Ian Curtis
   '01900000-0001-0010-0000-000000000002', -- Joy Division
   '{"instrument":"Vocals, guitar","start_year":"1976","end_year":"1980"}'),

  -- Johnny Marr
  ('01900000-0001-0020-0000-000000000015',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000006', -- Johnny Marr
   '01900000-0001-0010-0000-000000000004', -- The Smiths
   '{"instrument":"Guitar","start_year":"1982","end_year":"1987"}'),

  ('01900000-0001-0020-0000-000000000016',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000006', -- Johnny Marr
   '01900000-0001-0010-0000-000000000003', -- Electronic
   '{"instrument":"Guitar","start_year":"1987","end_year":"2001"}'),

  -- Phil Cunningham
  ('01900000-0001-0020-0000-000000000017',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000007', -- Phil Cunningham
   '01900000-0001-0010-0000-000000000001', -- New Order
   '{"instrument":"Guitar, keyboards","start_year":"2001"}'),

  ('01900000-0001-0020-0000-000000000018',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000007', -- Phil Cunningham
   '01900000-0001-0010-0000-000000000007', -- Bad Lieutenant
   '{"instrument":"Guitar, keyboards","start_year":"2008"}'),

  -- David Potts
  ('01900000-0001-0020-0000-000000000019',
   '01900000-0001-0002-0000-000000000001',
   '01900000-0001-0011-0000-000000000008', -- David Potts
   '01900000-0001-0010-0000-000000000006', -- Monaco
   '{"instrument":"Guitar, vocals","start_year":"1995","end_year":"1999"}');

-- ─────────────────────────────────────────────────────────────────────────────
-- Relationships — Released  (Band → Album)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO relationships
  (id, relationship_type_id, source_entity_id, target_entity_id, field_values)
VALUES
  -- Joy Division
  ('01900000-0001-0020-0000-000000000020', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000002', '01900000-0001-0012-0000-000000000001', '{}'),
  ('01900000-0001-0020-0000-000000000021', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000002', '01900000-0001-0012-0000-000000000002', '{}'),

  -- New Order
  ('01900000-0001-0020-0000-000000000022', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000001', '01900000-0001-0012-0000-000000000003', '{}'),
  ('01900000-0001-0020-0000-000000000023', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000001', '01900000-0001-0012-0000-000000000004', '{}'),
  ('01900000-0001-0020-0000-000000000024', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000001', '01900000-0001-0012-0000-000000000005', '{}'),
  ('01900000-0001-0020-0000-000000000025', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000001', '01900000-0001-0012-0000-000000000006', '{}'),
  ('01900000-0001-0020-0000-000000000026', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000001', '01900000-0001-0012-0000-000000000007', '{}'),
  ('01900000-0001-0020-0000-000000000027', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000001', '01900000-0001-0012-0000-000000000008', '{}'),
  ('01900000-0001-0020-0000-000000000028', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000001', '01900000-0001-0012-0000-000000000009', '{}'),
  ('01900000-0001-0020-0000-000000000029', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000001', '01900000-0001-0012-0000-000000000010', '{}'),

  -- Electronic
  ('01900000-0001-0020-0000-000000000030', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000003', '01900000-0001-0012-0000-000000000011', '{}'),
  ('01900000-0001-0020-0000-000000000031', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000003', '01900000-0001-0012-0000-000000000012', '{}'),
  ('01900000-0001-0020-0000-000000000032', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000003', '01900000-0001-0012-0000-000000000013', '{}'),

  -- The Smiths
  ('01900000-0001-0020-0000-000000000033', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000004', '01900000-0001-0012-0000-000000000014', '{}'),
  ('01900000-0001-0020-0000-000000000034', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000004', '01900000-0001-0012-0000-000000000015', '{}'),
  ('01900000-0001-0020-0000-000000000035', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000004', '01900000-0001-0012-0000-000000000016', '{}'),
  ('01900000-0001-0020-0000-000000000036', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000004', '01900000-0001-0012-0000-000000000017', '{}'),

  -- The Other Two
  ('01900000-0001-0020-0000-000000000037', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000005', '01900000-0001-0012-0000-000000000018', '{}'),

  -- Monaco
  ('01900000-0001-0020-0000-000000000038', '01900000-0001-0002-0000-000000000002',
   '01900000-0001-0010-0000-000000000006', '01900000-0001-0012-0000-000000000019', '{}');

-- ─────────────────────────────────────────────────────────────────────────────
-- Relationships — OriginatedFrom  (Band → Band)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO relationships
  (id, relationship_type_id, source_entity_id, target_entity_id, field_values)
VALUES
  ('01900000-0001-0020-0000-000000000039',
   '01900000-0001-0002-0000-000000000003',
   '01900000-0001-0010-0000-000000000001', -- New Order
   '01900000-0001-0010-0000-000000000002', -- Joy Division
   '{"year":"1980","notes":"Formed after the death of Joy Division vocalist Ian Curtis. The three surviving members recruited keyboardist Gillian Gilbert and adopted a new name."}');

-- ─────────────────────────────────────────────────────────────────────────────
-- Relationships — RelatedBand  (Band ↔ Band, undirected)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO relationships
  (id, relationship_type_id, source_entity_id, target_entity_id, field_values)
VALUES
  ('01900000-0001-0020-0000-000000000040',
   '01900000-0001-0002-0000-000000000004',
   '01900000-0001-0010-0000-000000000003', -- Electronic
   '01900000-0001-0010-0000-000000000001', -- New Order
   '{"context":"Bernard Sumner of New Order co-founded Electronic"}'),

  ('01900000-0001-0020-0000-000000000041',
   '01900000-0001-0002-0000-000000000004',
   '01900000-0001-0010-0000-000000000003', -- Electronic
   '01900000-0001-0010-0000-000000000004', -- The Smiths
   '{"context":"Johnny Marr of The Smiths co-founded Electronic"}'),

  ('01900000-0001-0020-0000-000000000042',
   '01900000-0001-0002-0000-000000000004',
   '01900000-0001-0010-0000-000000000001', -- New Order
   '01900000-0001-0010-0000-000000000005', -- The Other Two
   '{"context":"Stephen Morris and Gillian Gilbert of New Order"}'),

  ('01900000-0001-0020-0000-000000000043',
   '01900000-0001-0002-0000-000000000004',
   '01900000-0001-0010-0000-000000000001', -- New Order
   '01900000-0001-0010-0000-000000000006', -- Monaco
   '{"context":"Peter Hook of New Order co-founded Monaco"}'),

  ('01900000-0001-0020-0000-000000000044',
   '01900000-0001-0002-0000-000000000004',
   '01900000-0001-0010-0000-000000000001', -- New Order
   '01900000-0001-0010-0000-000000000007', -- Bad Lieutenant
   '{"context":"Bernard Sumner and Phil Cunningham of New Order"}'),

  ('01900000-0001-0020-0000-000000000045',
   '01900000-0001-0002-0000-000000000004',
   '01900000-0001-0010-0000-000000000001', -- New Order
   '01900000-0001-0010-0000-000000000008', -- Revenge
   '{"context":"Peter Hook of New Order founded Revenge"}');

-- ─────────────────────────────────────────────────────────────────────────────
-- Relationships — SignedTo  (Band → Label)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO relationships
  (id, relationship_type_id, source_entity_id, target_entity_id, field_values)
VALUES
  ('01900000-0001-0020-0000-000000000046',
   '01900000-0001-0002-0000-000000000005',
   '01900000-0001-0010-0000-000000000002', -- Joy Division
   '01900000-0001-0013-0000-000000000001', -- Factory Records
   '{"start_year":"1978","end_year":"1980"}'),

  ('01900000-0001-0020-0000-000000000047',
   '01900000-0001-0002-0000-000000000005',
   '01900000-0001-0010-0000-000000000001', -- New Order
   '01900000-0001-0013-0000-000000000001', -- Factory Records
   '{"start_year":"1980","end_year":"1992"}'),

  ('01900000-0001-0020-0000-000000000048',
   '01900000-0001-0002-0000-000000000005',
   '01900000-0001-0010-0000-000000000001', -- New Order
   '01900000-0001-0013-0000-000000000002', -- London Records
   '{"start_year":"1993","end_year":"2001"}'),

  ('01900000-0001-0020-0000-000000000049',
   '01900000-0001-0002-0000-000000000005',
   '01900000-0001-0010-0000-000000000003', -- Electronic
   '01900000-0001-0013-0000-000000000004', -- Parlophone
   '{"start_year":"1987","end_year":"2001"}'),

  ('01900000-0001-0020-0000-000000000050',
   '01900000-0001-0002-0000-000000000005',
   '01900000-0001-0010-0000-000000000004', -- The Smiths
   '01900000-0001-0013-0000-000000000003', -- Rough Trade Records
   '{"start_year":"1982","end_year":"1987"}'),

  ('01900000-0001-0020-0000-000000000051',
   '01900000-0001-0002-0000-000000000005',
   '01900000-0001-0010-0000-000000000005', -- The Other Two
   '01900000-0001-0013-0000-000000000002', -- London Records
   '{"start_year":"1993","end_year":"1999"}');
