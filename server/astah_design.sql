CREATE TABLE nation (
 nation_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 nation_name VARCHAR(100),
 nation_flag_image VARCHAR(500)
);


CREATE TABLE team (
 team_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 team_name VARCHAR(200),
 team_logo VARCHAR(500)
);


CREATE TABLE user (
 user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_mail VARCHAR(200),
 user_password VARCHAR(500)
);


CREATE TABLE match (
 match_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 away_team_id INT,
 FOREIGN KEY (away_team_id) REFERENCES team(team_id),
 home_team_id INT ,
 FOREIGN KEY (home_team_id) REFERENCES team(team_id),
 match_date DATE,
 match_time TIME(10),
 match_result NUMERIC(6, 3)
);



CREATE TABLE player (
 player_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 team_id INT,
 FOREIGN KEY (team_id) REFERENCES team(team_id),
 nation_id INT,
 FOREIGN KEY (nation_id) REFERENCES nation(nation_id),
 player_first_name VARCHAR(100),
 player_last_name VARCHAR(100),
 player_age SMALLINT,
 player_height SMALLINT,
 player_weight SMALLINT
);


CREATE TABLE player_injury (
 player_injury_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 player_id INT,
 FOREIGN KEY (player_id) REFERENCES player(player_id),
 player_injury_diagnosis VARCHAR(200),
 player_injury_games_missed SMALLINT,
 player_injury_start DATE,
 player_injury_end DATE
);


CREATE TABLE player_season (
 player_season_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 player_id INT,
 FOREIGN KEY (player_id) REFERENCES player(player_id),
 player_season_year SMALLINT,
 player_season_games_played SMALLINT,
 player_season_minutes_played SMALLINT,
 player_season_fouls_against SMALLINT,
 player_season_aerial_duels SMALLINT,
 player_season_tackles SMALLINT,
 player_season_dribbles_attempted SMALLINT
);


CREATE TABLE user_favourite (
 user_favourite_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 player_id INT,
 FOREIGN KEY (player_id) REFERENCES player(player_id),
 user_id INT
 FOREIGN KEY (user_id) REFERENCES user(user_id),
);

CREATE TABLE graph_data (
 graph_data_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 player_id INT,
 FOREIGN KEY (player_id) REFERENCES player(player_id),
 week_1 NUMERIC(5, 5),
 week_2 NUMERIC(5, 5),
 week_3 NUMERIC(5, 5),
 week_4 NUMERIC(5, 5),
 week_5 NUMERIC(5, 5),
 week_6 NUMERIC(5, 5),
 week_7 NUMERIC(5, 5),
 week_8 NUMERIC(5, 5),
 week_9 NUMERIC(5, 5),
 week_10 NUMERIC(5, 5),
 week_11 NUMERIC(5, 5),
 week_12 NUMERIC(5, 5),
 week_13 NUMERIC(5, 5),
 week_14 NUMERIC(5, 5),
 week_15 NUMERIC(5, 5),
 week_16 NUMERIC(5, 5),
 week_17 NUMERIC(5, 5),
 week_18 NUMERIC(5, 5),
 week_19 NUMERIC(5, 5),
 week_20 NUMERIC(5, 5),
 week_21 NUMERIC(5, 5),
 week_22 NUMERIC(5, 5),
 week_23 NUMERIC(5, 5),
 week_24 NUMERIC(5, 5),
 week_25 NUMERIC(5, 5),
 week_26 NUMERIC(5, 5),
 week_27 NUMERIC(5, 5),
 week_28 NUMERIC(5, 5),
 week_29 NUMERIC(5, 5),
 week_30 NUMERIC(5, 5),
 week_31 NUMERIC(5, 5),
 week_32 NUMERIC(5, 5),
 week_33 NUMERIC(5, 5),
 week_34 NUMERIC(5, 5),
 week_35 NUMERIC(5, 5),
 week_36 NUMERIC(5, 5),
 week_37 NUMERIC(5, 5),
 week_38 NUMERIC(5, 5)
);