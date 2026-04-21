-- Nations
INSERT INTO nation (nation_name, nation_flag_image) VALUES ('Sweden', 'link.to.sweden.flag.com');
INSERT INTO nation (nation_name, nation_flag_image) VALUES ('England', 'link.to.england.flag.com');
INSERT INTO nation (nation_name, nation_flag_image) VALUES ('France', 'link.to.france.flag.com');
INSERT INTO nation (nation_name, nation_flag_image) VALUES ('Norway', 'link.to.norway.flag.com');
INSERT INTO nation (nation_name, nation_flag_image) VALUES ('Brazil', 'link.to.brazil.flag.com');

-- Teams
INSERT INTO team (team_name, team_logo, team_color) VALUES ('Liverpool', 'link.to.liverpool.badge.com', '#C8102E');
INSERT INTO team (team_name, team_logo, team_color) VALUES ('Tottenham', 'link.to.tottenham.badge.com', '#132257');
INSERT INTO team (team_name, team_logo, team_color) VALUES ('Arsenal', 'link.to.arsenal.badge.com', '#EF0107');
INSERT INTO team (team_name, team_logo, team_color) VALUES ('Chelsea', 'link.to.chelsea.badge.com', '#034694');

-- Players
-- Liverpool (team_id=1)
INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_position, player_age, player_height, player_weight, player_photo, player_kit_number, player_injury_risk, player_risk_factor_1, player_risk_factor_2, player_risk_factor_3)
VALUES (1, 1, 'Alexander', 'Isak', 'Forward', 25, '190 cm', '75 kg', 'link.to.isak.photo.com', 14, 0.50, 'High workload', 'Previous ACL', 'Fatigue');

INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_position, player_age, player_height, player_weight, player_photo, player_kit_number, player_injury_risk, player_risk_factor_1, player_risk_factor_2, player_risk_factor_3)
VALUES (1, 1, 'Zlatan', 'Ibrahimovic', 'Forward', 43, '195 cm', '95 kg', 'link.to.zlatan.photo.com', 11, 0.82, 'Age', 'High workload', 'Contact sport');

INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_position, player_age, player_height, player_weight, player_photo, player_kit_number, player_injury_risk, player_risk_factor_1, player_risk_factor_2, player_risk_factor_3)
VALUES (1, 3, 'Virgil', 'van Dijk', 'Defender', 33, '193 cm', '92 kg', 'link.to.vandijk.photo.com', 4, 0.40, 'Age', 'High duels', 'Contact sport');

INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_position, player_age, player_height, player_weight, player_photo, player_kit_number, player_injury_risk, player_risk_factor_1, player_risk_factor_2, player_risk_factor_3)
VALUES (1, 2, 'Trent', 'Alexander-Arnold', 'Midfielder', 26, '175 cm', '69 kg', 'link.to.taa.photo.com', 66, 0.55, 'High minutes', 'Fatigue', 'Previous hamstring');

-- Tottenham (team_id=2)
INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_position, player_age, player_height, player_weight, player_photo, player_kit_number, player_injury_risk, player_risk_factor_1, player_risk_factor_2, player_risk_factor_3)
VALUES (2, 2, 'Harry', 'Kane', 'Forward', 30, '188 cm', '86 kg', 'link.to.kane.photo.com', 9, 0.75, 'Age', 'High minutes', 'Contact sport');

INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_position, player_age, player_height, player_weight, player_photo, player_kit_number, player_injury_risk, player_risk_factor_1, player_risk_factor_2, player_risk_factor_3)
VALUES (2, 4, 'Erling', 'Haaland', 'Forward', 23, '194 cm', '88 kg', 'link.to.haaland.photo.com', 9, 0.61, 'High workload', 'Physical play', 'Fatigue');

INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_position, player_age, player_height, player_weight, player_photo, player_kit_number, player_injury_risk, player_risk_factor_1, player_risk_factor_2, player_risk_factor_3)
VALUES (2, 3, 'Hugo', 'Lloris', 'Goalkeeper', 37, '188 cm', '78 kg', 'link.to.lloris.photo.com', 1, 0.45, 'Age', 'Shot-stopping', 'Contact');

-- Arsenal (team_id=3)
INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_position, player_age, player_height, player_weight, player_photo, player_kit_number, player_injury_risk, player_risk_factor_1, player_risk_factor_2, player_risk_factor_3)
VALUES (3, 5, 'Gabriel', 'Martinelli', 'Forward', 22, '181 cm', '75 kg', 'link.to.martinelli.photo.com', 11, 0.68, 'High dribbles', 'Fatigue', 'Contact sport');

INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_position, player_age, player_height, player_weight, player_photo, player_kit_number, player_injury_risk, player_risk_factor_1, player_risk_factor_2, player_risk_factor_3)
VALUES (3, 2, 'Bukayo', 'Saka', 'Midfielder', 22, '178 cm', '72 kg', 'link.to.saka.photo.com', 7, 0.72, 'High workload', 'Previous ankle', 'Fatigue');

-- Chelsea (team_id=4)
INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_position, player_age, player_height, player_weight, player_photo, player_kit_number, player_injury_risk, player_risk_factor_1, player_risk_factor_2, player_risk_factor_3)
VALUES (4, 2, 'Reece', 'James', 'Defender', 24, '180 cm', '80 kg', 'link.to.james.photo.com', 24, 0.88, 'Recurring knee', 'High minutes', 'Contact sport');

INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_position, player_age, player_height, player_weight, player_photo, player_kit_number, player_injury_risk, player_risk_factor_1, player_risk_factor_2, player_risk_factor_3)
VALUES (4, 3, 'Christopher', 'Nkunku', 'Forward', 26, '175 cm', '68 kg', 'link.to.nkunku.photo.com', 45, 0.59, 'Previous surgery', 'Fatigue', 'High workload');

-- Player seasons (season year 2025 = 2025/2026 season)
-- player_id 1 = Isak
INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (1, 2025, 30, 1800, 62, 20, 90, 28, 3, 0, 15, 8, 228, 5);

-- player_id 2 = Zlatan
INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (2, 2025, 20, 1500, 35, 18, 60, 12, 4, 0, 10, 5, 80, 8);

-- player_id 3 = van Dijk
INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (3, 2025, 32, 2880, 20, 30, 120, 55, 2, 0, 3, 1, 10, 2);

-- player_id 4 = TAA
INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (4, 2025, 28, 2100, 30, 22, 80, 40, 5, 0, 4, 12, 60, 4);

-- player_id 5 = Kane
INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (5, 2025, 28, 2100, 40, 25, 75, 15, 5, 1, 22, 10, 90, 3);

-- player_id 6 = Haaland
INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (6, 2025, 25, 2000, 38, 15, 70, 10, 3, 0, 25, 6, 55, 5);

-- player_id 7 = Lloris
INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (7, 2025, 30, 2700, 5, 8, 20, 5, 1, 0, 0, 0, 2, 3);

-- player_id 8 = Martinelli
INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (8, 2025, 26, 1900, 55, 18, 85, 20, 4, 0, 12, 9, 140, 6);

-- player_id 9 = Saka
INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (9, 2025, 33, 2850, 70, 22, 95, 35, 6, 0, 14, 16, 200, 2);

-- player_id 10 = Reece James
INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (10, 2025, 15, 1100, 18, 20, 65, 30, 3, 0, 2, 5, 40, 14);

-- player_id 11 = Nkunku
INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (11, 2025, 22, 1700, 42, 16, 72, 18, 4, 0, 11, 7, 110, 7);

-- Player injuries (FK is player_season_id)
-- Isak (player_season_id=1): ACL tear
INSERT INTO player_injury (player_season_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (1, 'ACL tear', 120, '2026-01-10'::date, '2026-05-10'::date, 'Severe', 'Knee');

-- Zlatan (player_season_id=2): Hamstring strain
INSERT INTO player_injury (player_season_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (2, 'Hamstring strain', 21, '2026-03-01'::date, '2026-03-22'::date, 'Moderate', 'Hamstring');

-- Zlatan: second injury
INSERT INTO player_injury (player_season_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (2, 'Calf strain', 14, '2025-11-05'::date, '2025-11-19'::date, 'Minor', 'Calf');

-- Kane (player_season_id=5): ankle sprain
INSERT INTO player_injury (player_season_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (5, 'Ankle sprain', 10, '2025-10-14'::date, '2025-10-24'::date, 'Minor', 'Ankle');

-- Reece James (player_season_id=10): knee surgery (ongoing)
INSERT INTO player_injury (player_season_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (10, 'Knee ligament damage', 90, '2026-02-01'::date, NULL, 'Severe', 'Knee');

-- Saka (player_season_id=9): ankle knock
INSERT INTO player_injury (player_season_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (9, 'Ankle knock', 7, '2025-12-10'::date, '2025-12-17'::date, 'Minor', 'Ankle');

-- Martinelli (player_season_id=8): muscle fatigue
INSERT INTO player_injury (player_season_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (8, 'Muscle fatigue', 10, '2026-01-20'::date, '2026-01-30'::date, 'Minor', 'Thigh');

-- Nkunku (player_season_id=11): groin strain
INSERT INTO player_injury (player_season_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (11, 'Groin strain', 28, '2025-09-15'::date, '2025-10-13'::date, 'Moderate', 'Groin');

-- Graph data (player_id 1–6 for variety)
INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (1, 42.30, 'GW29', 0.73, 0.14, 0.96, 0.08, 0.55, 0.32, 0.81, 0.47, 0.62, 0.19, 0.88, 0.03, 0.71, 0.44, 0.57, 0.29, 0.93, 0.66, 0.12, 0.84, 0.39, 0.75, 0.21, 0.58, 0.90, 0.43, 0.07, 0.68, 0.35, 0.82, 0.16, 0.94, 0.50, 0.27, 0.79, 0.61, 0.04, 0.48);

INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (2, 387.55, 'GW29', 0.60, 0.70, 0.65, 0.75, 0.80, 0.72, 0.85, 0.78, 0.91, 0.83, 0.76, 0.88, 0.82, 0.79, 0.84, 0.77, 0.90, 0.86, 0.73, 0.81, 0.88, 0.79, 0.85, 0.92, 0.80, 0.75, 0.83, 0.87, 0.79, 0.82, 0.76, 0.89, 0.84, 0.78, 0.86, 0.80, 0.73, 0.79);

INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (5, 215.80, 'GW29', 0.55, 0.60, 0.58, 0.63, 0.70, 0.65, 0.72, 0.68, 0.75, 0.71, 0.66, 0.73, 0.69, 0.74, 0.70, 0.67, 0.76, 0.72, 0.65, 0.71, 0.78, 0.74, 0.69, 0.75, 0.71, 0.68, 0.76, 0.73, 0.70, 0.74, 0.68, 0.79, 0.75, 0.71, 0.77, 0.73, 0.67, 0.74);

INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (9, 158.40, 'GW29', 0.50, 0.55, 0.62, 0.58, 0.65, 0.70, 0.63, 0.68, 0.72, 0.67, 0.74, 0.69, 0.65, 0.71, 0.68, 0.64, 0.73, 0.70, 0.66, 0.72, 0.69, 0.75, 0.71, 0.67, 0.74, 0.70, 0.65, 0.72, 0.68, 0.75, 0.71, 0.67, 0.74, 0.70, 0.66, 0.73, 0.69, 0.65);

INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (10, 742.15, 'GW29', 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.82, 0.87, 0.83, 0.88, 0.85, 0.90, 0.87, 0.83, 0.88, 0.85, 0.91, 0.88, 0.84, 0.89, 0.86, 0.82, 0.87, 0.84, 0.88, 0.85, 0.90, 0.87, 0.83, 0.88, 0.85, 0.89, 0.86, 0.82);

-- Matches (past and upcoming across multiple gameweeks)
-- GW30 - past
INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (1, 3, '2026-03-15'::date, '14:00:00', 3001, 'gw30', 'Anfield', 2, 1, 0.00, 0.00, true);

INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (4, 2, '2026-03-16'::date, '16:30:00', 3002, 'gw30', 'Stamford Bridge', 0, 2, 0.00, 0.00, true);

-- GW31 - past
INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (2, 1, '2026-04-08'::date, '20:00:00', 1002, 'gw31', 'Tottenham Hotspur Stadium', 1, 1, 0.00, 0.00, true);

INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (3, 4, '2026-04-09'::date, '19:45:00', 3003, 'gw31', 'Emirates Stadium', 3, 1, 0.00, 0.00, true);

-- GW32 - past
INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (1, 2, '2026-04-10'::date, '14:00:00', 1001, 'gw32', 'Anfield', 3, 0, 0.00, 0.00, true);

INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (4, 3, '2026-04-12'::date, '15:00:00', 3004, 'gw32', 'Stamford Bridge', 1, 2, 0.00, 0.00, true);

-- GW33 - upcoming
INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (3, 1, '2026-04-22'::date, '20:00:00', 3005, 'gw33', 'Emirates Stadium', 0, 0, 0.70, 0.56, false);

INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (2, 4, '2026-04-23'::date, '17:30:00', 3006, 'gw33', 'Tottenham Hotspur Stadium', 0, 0, 0.60, 0.73, false);

-- GW34 - upcoming
INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (1, 2, '2026-04-25'::date, '17:30:00', 2001, 'gw34', 'Anfield', 0, 0, 0.51, 0.75, false);

INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (3, 4, '2026-04-26'::date, '14:00:00', 3007, 'gw34', 'Emirates Stadium', 0, 0, 0.70, 0.73, false);

INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (2, 1, '2026-04-27'::date, '14:00:00', 2002, 'gw34', 'Tottenham Hotspur Stadium', 0, 0, 0.75, 0.51, false);

-- App user
INSERT INTO app_user (user_mail, user_password) VALUES ('user@mail.com', 'user_password');

-- User favourites
INSERT INTO user_favourite (player_id, user_id) VALUES (1, 1);
INSERT INTO user_favourite (player_id, user_id) VALUES (5, 1);
INSERT INTO user_favourite (player_id, user_id) VALUES (9, 1);
INSERT INTO user_favourite (player_id, user_id) VALUES (3, 1);
