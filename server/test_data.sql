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

-- Graph data (all players)
INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (1, 42.30, 'GW29', 0.73, 0.14, 0.96, 0.08, 0.55, 0.32, 0.81, 0.47, 0.62, 0.19, 0.88, 0.03, 0.71, 0.44, 0.57, 0.29, 0.93, 0.66, 0.12, 0.84, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99);

INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (2, 387.55, 'GW29', 0.60, 0.70, 0.65, 0.75, 0.80, 0.72, 0.85, 0.78, 0.91, 0.83, 0.76, 0.99, 0.99, 0.79, 0.84, 0.77, 0.90, 0.86, 0.73, 0.81, 0.88, 0.79, 0.85, 0.92, 0.80, 0.75, 0.99, 0.99, 0.99, 0.82, 0.76, 0.89, 0.84, 0.78, 0.86, 0.80, 0.73, 0.79);

INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (5, 215.80, 'GW29', 0.55, 0.60, 0.58, 0.63, 0.70, 0.65, 0.72, 0.68, 0.99, 0.99, 0.66, 0.73, 0.69, 0.74, 0.70, 0.67, 0.76, 0.72, 0.65, 0.71, 0.78, 0.74, 0.69, 0.75, 0.71, 0.68, 0.76, 0.73, 0.70, 0.74, 0.68, 0.79, 0.75, 0.71, 0.77, 0.73, 0.67, 0.74);

INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (9, 158.40, 'GW29', 0.50, 0.55, 0.62, 0.58, 0.65, 0.70, 0.63, 0.68, 0.72, 0.67, 0.74, 0.69, 0.65, 0.71, 0.68, 0.64, 0.99, 0.70, 0.66, 0.72, 0.69, 0.75, 0.71, 0.67, 0.74, 0.70, 0.65, 0.72, 0.68, 0.75, 0.71, 0.67, 0.74, 0.70, 0.66, 0.73, 0.69, 0.65);

INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (10, 742.15, 'GW29', 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.82, 0.87, 0.83, 0.88, 0.85, 0.90, 0.87, 0.83, 0.88, 0.85, 0.91, 0.88, 0.84, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99);

INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (3, 28.60, 'GW29', 0.30, 0.35, 0.28, 0.33, 0.38, 0.31, 0.36, 0.40, 0.34, 0.29, 0.37, 0.32, 0.27, 0.35, 0.30, 0.38, 0.33, 0.28, 0.36, 0.31, 0.26, 0.34, 0.29, 0.37, 0.32, 0.40, 0.35, 0.30, 0.38, 0.33, 0.28, 0.36, 0.31, 0.39, 0.34, 0.29, 0.37, 0.32);

INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (4, 63.20, 'GW29', 0.42, 0.50, 0.46, 0.53, 0.48, 0.55, 0.51, 0.44, 0.58, 0.52, 0.47, 0.54, 0.49, 0.56, 0.50, 0.45, 0.53, 0.48, 0.57, 0.51, 0.46, 0.54, 0.49, 0.44, 0.52, 0.47, 0.55, 0.50, 0.58, 0.53, 0.48, 0.56, 0.51, 0.46, 0.54, 0.49, 0.57, 0.52);

INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (6, 98.75, 'GW29', 0.52, 0.57, 0.61, 0.55, 0.63, 0.58, 0.66, 0.60, 0.54, 0.62, 0.67, 0.59, 0.64, 0.57, 0.61, 0.65, 0.59, 0.53, 0.60, 0.64, 0.58, 0.63, 0.57, 0.61, 0.66, 0.60, 0.55, 0.62, 0.67, 0.61, 0.56, 0.63, 0.58, 0.65, 0.60, 0.54, 0.61, 0.66);

INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (7, 19.45, 'GW29', 0.25, 0.22, 0.28, 0.24, 0.20, 0.26, 0.23, 0.29, 0.21, 0.27, 0.24, 0.20, 0.26, 0.23, 0.28, 0.21, 0.25, 0.22, 0.27, 0.24, 0.20, 0.26, 0.23, 0.29, 0.22, 0.25, 0.21, 0.27, 0.24, 0.20, 0.26, 0.23, 0.28, 0.21, 0.25, 0.22, 0.27, 0.24);

INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (8, 112.30, 'GW29', 0.60, 0.65, 0.58, 0.63, 0.70, 0.66, 0.61, 0.68, 0.73, 0.67, 0.62, 0.69, 0.64, 0.71, 0.66, 0.60, 0.67, 0.72, 0.65, 0.61, 0.68, 0.99, 0.99, 0.65, 0.60, 0.67, 0.72, 0.66, 0.61, 0.69, 0.64, 0.71, 0.66, 0.62, 0.69, 0.64, 0.71, 0.67);

INSERT INTO graph_data (player_id, player_injury_trend, graph_data_current_gw, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (11, 77.90, 'GW29', 0.48, 0.53, 0.57, 0.51, 0.99, 0.99, 0.99, 0.99, 0.99, 0.55, 0.60, 0.53, 0.48, 0.56, 0.51, 0.58, 0.53, 0.47, 0.55, 0.50, 0.57, 0.52, 0.46, 0.54, 0.59, 0.53, 0.48, 0.56, 0.51, 0.58, 0.52, 0.47, 0.55, 0.50, 0.57, 0.52, 0.48, 0.55);

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

-- GW35 - upcoming
INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (1, 3, '2026-05-03'::date, '16:30:00', 4001, 'gw35', 'Anfield', 0, 0, 0.57, 0.70, false);

INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (4, 2, '2026-05-04'::date, '14:00:00', 4002, 'gw35', 'Stamford Bridge', 0, 0, 0.73, 0.60, false);

-- GW36 - upcoming
INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (2, 3, '2026-05-10'::date, '14:00:00', 4003, 'gw36', 'Tottenham Hotspur Stadium', 0, 0, 0.60, 0.70, false);

INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (1, 4, '2026-05-10'::date, '16:30:00', 4004, 'gw36', 'Anfield', 0, 0, 0.57, 0.73, false);

-- GW37 - upcoming
INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (3, 2, '2026-05-17'::date, '14:00:00', 4005, 'gw37', 'Emirates Stadium', 0, 0, 0.70, 0.60, false);

INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (4, 1, '2026-05-17'::date, '16:30:00', 4006, 'gw37', 'Stamford Bridge', 0, 0, 0.73, 0.57, false);

-- GW38 - upcoming (final day)
INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (1, 2, '2026-05-24'::date, '16:00:00', 4007, 'gw38', 'Anfield', 0, 0, 0.57, 0.60, false);

INSERT INTO match (home_team_id, away_team_id, match_date, match_time, match_fixture_id, match_game_week, match_venue, match_goals_home, match_goals_away, home_avg_injury_risk, away_avg_injury_risk, match_is_played)
VALUES (3, 4, '2026-05-24'::date, '16:00:00', 4008, 'gw38', 'Emirates Stadium', 0, 0, 0.70, 0.73, false);

-- Player seasons 2024 (season year 2024 = 2024/2025 season)
-- player_season_id 12–22
INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (1, 2024, 34, 2900, 58, 18, 88, 25, 2, 0, 18, 10, 210, 3);

INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (2, 2024, 25, 1800, 30, 15, 55, 10, 5, 1, 8, 4, 70, 10);

INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (3, 2024, 35, 3150, 18, 28, 130, 60, 1, 0, 4, 2, 8, 1);

INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (4, 2024, 30, 2400, 28, 20, 75, 38, 4, 0, 5, 14, 65, 5);

INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (5, 2024, 32, 2700, 44, 22, 80, 18, 6, 0, 26, 12, 95, 4);

INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (6, 2024, 30, 2500, 35, 12, 68, 9, 2, 0, 30, 5, 50, 6);

INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (7, 2024, 33, 2970, 4, 7, 18, 4, 0, 0, 0, 0, 1, 2);

INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (8, 2024, 30, 2200, 60, 20, 90, 22, 5, 0, 15, 11, 160, 5);

INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (9, 2024, 36, 3100, 75, 24, 100, 38, 7, 0, 16, 18, 215, 1);

INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (10, 2024, 10, 750, 12, 14, 40, 20, 2, 0, 1, 3, 25, 18);

INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_fouls_commited, player_season_duels_total, player_season_tackles, player_season_yellow_cards, player_season_red_cards, player_season_goals, player_season_assists, player_season_dribbles_attempts, player_season_games_missed)
VALUES (11, 2024, 28, 2100, 38, 14, 68, 16, 3, 0, 13, 9, 120, 6);

-- Injuries for 2024 seasons (player_season_id 12–22)
-- Isak 2024 (ps_id=12): hamstring
INSERT INTO player_injury (player_season_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (12, 'Hamstring strain', 18, '2025-02-05'::date, '2025-02-23'::date, 'Minor', 'Hamstring');

-- Zlatan 2024 (ps_id=13): back spasm + knee bruise
INSERT INTO player_injury (player_season_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (13, 'Back spasm', 12, '2024-11-10'::date, '2024-11-22'::date, 'Minor', 'Back');

INSERT INTO player_injury (player_season_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (13, 'Knee bruise', 7, '2025-03-01'::date, '2025-03-08'::date, 'Minor', 'Knee');

-- Kane 2024 (ps_id=16): thigh strain
INSERT INTO player_injury (player_season_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (16, 'Thigh strain', 25, '2025-01-18'::date, '2025-02-12'::date, 'Moderate', 'Thigh');

-- Reece James 2024 (ps_id=21): hamstring tear
INSERT INTO player_injury (player_season_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (21, 'Hamstring tear', 55, '2024-09-20'::date, '2024-11-14'::date, 'Severe', 'Hamstring');

-- Martinelli 2024 (ps_id=19): ankle sprain
INSERT INTO player_injury (player_season_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (19, 'Ankle sprain', 14, '2025-04-01'::date, '2025-04-15'::date, 'Minor', 'Ankle');

-- Nkunku 2024 (ps_id=22): knee surgery
INSERT INTO player_injury (player_season_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (22, 'Knee surgery', 75, '2024-10-05'::date, '2024-12-19'::date, 'Severe', 'Knee');

-- App user
INSERT INTO app_user (user_mail, user_password) VALUES ('user@mail.com', 'user_password');

-- User favourites
INSERT INTO user_favourite (player_id, user_id) VALUES (1, 1);
INSERT INTO user_favourite (player_id, user_id) VALUES (5, 1);
INSERT INTO user_favourite (player_id, user_id) VALUES (9, 1);
INSERT INTO user_favourite (player_id, user_id) VALUES (3, 1);
