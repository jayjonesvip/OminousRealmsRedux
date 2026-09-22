# Google Analytics

Measurement ID: `G-1NQNTF6JMB`. `js/analytics.js` loads the asynchronous Google tag on the production HTTPS domain only. Both index and how-to-play include it. Local disk play and previews send nothing. Gameplay works if the tag is blocked.

Events:

| Event | Trigger / parameters |
| --- | --- |
| page_view | Google tag configuration on page load |
| screen_view | Changed game screen; screen_name |
| new_game | Actual warrior creation; weapon_type |
| enemy_defeated | Combat kill, excluding bribes; enemy_id, enemy_level |
| battle_lost | Combat defeat; enemy_id, enemy_level |
| level_up | Victory awards a new level |
| quest_started | Grandfather quest accepted or retrieval begun; quest_id, quest_type |
| quest_finished | Grandfather objective completed or retrieval collected/delivered; quest_id, quest_type |
| game_completed | Final overlord defeated |

Gameplay events include level and realm. No player names, coordinates, dialogue, inventory or save contents are sent. The final act emits game_completed rather than a second grandfather quest. Trap offers are not counted as grandfather/retrieval quests. Loading/importing saves does not replay progress events. Repeated screen renders do not emit new screen events.

Use GA4 Realtime to check arrival. Custom event parameters such as quest_id, enemy_id and realm can be registered as event-scoped custom dimensions for reporting. This code does not modify the GA property or mark events as key events.

Implementation reference: https://developers.google.com/tag-platform/gtagjs/reference
