-- Nations
INSERT INTO nation (nation_name, nation_flag_image) VALUES ('Sweden', 'link.to.sweden.flag.com');
INSERT INTO nation (nation_name, nation_flag_image) VALUES ('England', 'link.to.england.flag.com');

-- Teams
INSERT INTO team (team_name, team_logo, team_color) VALUES ('Liverpool', 'link.to.liverpool.badge.com', '#C8102E');
INSERT INTO team (team_name, team_logo, team_color) VALUES ('Tottenham', 'link.to.tottenham.badge.com', '#132257');

-- Players
INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_age, player_height, player_weight, player_photo, player_kit_number, player_injury_risk, player_risk_factor_1, player_risk_factor_2, player_risk_factor_3)
VALUES (1, 1, 'Alexander', 'Isak', 25, '190 cm', '75 kg', 'link.to.isak.photo.com', 14, 0.50, 'High workload', 'Previous ACL', null);

INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_age, player_height, player_weight, player_photo, player_kit_number, player_injury_risk, player_risk_factor_1, player_risk_factor_2, player_risk_factor_3)
VALUES (2, 2, 'Harry', 'Kane', 30, '188 cm', '86 kg', 'link.to.kane.photo.com', 9, 0.75, 'Age', 'High minutes', 'Contact sport');

INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_age, player_height, player_weight, player_photo, player_kit_number, player_injury_risk, player_risk_factor_1, player_risk_factor_2, player_risk_factor_3)
VALUES (1, 1, 'Zlatan', 'Ibrahimovic', 25, '195 cm', '95 kg', 'link.to.zlatan.photo.com', 11, 0.51, 'Age', null, null);

-- Player seasons
INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_duels_total, player_season_tackles, player_season_dribbles_attempts, player_season_games_missed)
VALUES (1, 2025, 30, 1800, 62, 90, 28, 228, 5);

INSERT INTO player_season (player_id, player_season_year, player_season_appearences, player_season_minutes, player_season_fouls_drawn, player_season_duels_total, player_season_tackles, player_season_dribbles_attempts, player_season_games_missed)
VALUES (2, 2025, 28, 2100, 40, 75, 15, 90, 3);

-- Player injuries
INSERT INTO player_injury (player_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (1, 'ACL tear', 120, '2026-01-10'::date, '2026-05-10'::date, 'Severe', 'Knee');

INSERT INTO player_injury (player_id, player_injury_type, player_injury_days_out, player_injury_start, player_injury_end, player_injury_severity, player_injury_region)
VALUES (3, 'Hamstring strain', 21, '2026-03-01'::date, '2026-03-22'::date, 'Moderate', 'Hamstring');

-- Graph data
INSERT INTO graph_data (player_id, gw_1, gw_2, gw_3, gw_4, gw_5, gw_6, gw_7, gw_8, gw_9, gw_10, gw_11, gw_12, gw_13, gw_14, gw_15, gw_16, gw_17, gw_18, gw_19, gw_20, gw_21, gw_22, gw_23, gw_24, gw_25, gw_26, gw_27, gw_28, gw_29, gw_30, gw_31, gw_32, gw_33, gw_34, gw_35, gw_36, gw_37, gw_38)
VALUES (1, 0.73, 0.14, 0.96, 0.08, 0.55, 0.32, 0.81, 0.47, 0.62, 0.19, 0.88, 0.03, 0.71, 0.44, 0.57, 0.29, 0.93, 0.66, 0.12, 0.84, 0.39, 0.75, 0.21, 0.58, 0.90, 0.43, 0.07, 0.68, 0.35, 0.82, 0.16, 0.94, 0.50, 0.27, 0.79, 0.61, 0.04, 0.48);

-- Past matches
INSERT INTO past_match (away_team_id, home_team_id, past_match_date, past_match_time, past_match_goals_away, past_match_goals_home, past_match_fixture_id, past_match_venue)
VALUES (2, 1, '2026-04-10'::date, '14:00:00', 0, 3, 1001, 'Anfield');

INSERT INTO past_match (away_team_id, home_team_id, past_match_date, past_match_time, past_match_goals_away, past_match_goals_home, past_match_fixture_id, past_match_venue)
VALUES (1, 2, '2026-04-08'::date, '20:00:00', 1, 1, 1002, 'Tottenham Hotspur Stadium');

-- Next matches
INSERT INTO next_match (away_team_id, home_team_id, next_match_date, next_match_time, next_match_fixture_id, next_match_venue)
VALUES (2, 1, '2026-04-18'::date, '17:30:00', 2001, 'Anfield');

INSERT INTO next_match (away_team_id, home_team_id, next_match_date, next_match_time, next_match_fixture_id, next_match_venue)
VALUES (1, 2, '2026-04-20'::date, '14:00:00', 2002, 'Tottenham Hotspur Stadium');

-- App user
INSERT INTO app_user (user_mail, user_password) VALUES ('user@mail.com', 'user_password');

-- User favourites
INSERT INTO user_favourite (player_id, user_id) VALUES (1, 1);
INSERT INTO user_favourite (player_id, user_id) VALUES (2, 1);
