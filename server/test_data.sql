INSERT INTO nation (nation_name, nation_flag_image) values ('Sweden', 'link.to.sweden.flag.com');
INSERT INTO nation (nation_name, nation_flag_image) values ('England', 'link.to.england.flag.com');
INSERT INTO team (team_name, team_logo) values ('Liverpool', 'link.to.liverpool.badge.com');
INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_age, player_height, player_weight) values (1, 1, 'Alexander', 'Isak', 25, 190, 75);
INSERT INTO player (team_id, nation_id, player_first_name, player_last_name, player_age, player_height, player_weight) values (1, 2, 'Harry', 'Kane', 25, 190, 75);

SELECT * FROM player p JOIN team t ON t.team_id = p.team_id JOIN nation n ON n.nation_id = p.nation_id;