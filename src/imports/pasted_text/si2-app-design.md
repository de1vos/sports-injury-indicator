
Build a complete light-themed, Apple-inspired website for "SI2 — Soccer Injury Indicator" — an app that proactively predicts pre-match injury risk for professional football players. The site has two main views: a Home page showing Premier League teams, and a Team view showing players as interactive FIFA-style cards.

GLOBAL DESIGN SYSTEM:

Background: soft off-white (#F5F6FA)
All corners generously rounded everywhere — cards (20-24px), buttons (rounded-full), pills (rounded-full), inputs (rounded-full), modals (24px). Nothing has sharp edges. Think iOS/Apple aesthetic
Fonts: JetBrains Mono for all numbers, stats, data labels. DM Sans for headings, body text, and navigation
Primary blue: #1A56DB — used for branding, buttons, active states, hover highlights, low-risk
Risk color system applied consistently everywhere: blue (#1A56DB) = low 0-25%, teal (#0D9488) = moderate 26-45%, orange (#EA580C) = elevated 46-65%, red (#DC2626) = high 66-100%
White cards (#FFFFFF) with soft borders (rgba(0,0,0,0.06)) and subtle shadows (0 2px 8px rgba(0,0,0,0.04))
Text: charcoal (#1A1A2E) for primary, muted gray (#6B7280) for secondary
Smooth transitions on everything (0.2-0.3s ease). Hover states lift cards slightly (translateY(-2px)) with increased shadow
Page transitions: gentle fade + slide-up animation when navigating between views


PERSISTENT TOP NAVIGATION BAR:
Fixed to top. White background with subtle bottom border. Contains:

Left: "SI2" logo in bold blue, acts as home button
Center: search bar with rounded-full shape, light gray background, magnifying glass icon. As user types, a dropdown appears auto-suggesting teams and players with small labels indicating which type each result is ("Team" or "Player"). Clicking a team goes to the team view. Clicking a player goes directly to that player's card in the team view
Right: a minimal "Watchlist" link with a small star icon and counter badge showing number of favorited players


VIEW 1 — HOME PAGE (Teams Overview):
Page title: "Premier League" in large bold charcoal (36px) with the current season "2025/26" in a blue pill badge next to it. Subtitle in muted gray: "Select a team to view player injury risk predictions."
Below: a responsive grid of team cards (4 columns on desktop, 2 on mobile). Each team card is:

White background, rounded-2xl (24px corners), soft shadow
Large team name in bold charcoal centered
Below the name: a row of three small stats in mono text — "Squad: 25", "Avg Risk: 38%", "Injuries: 12"
The "Avg Risk" value is color-coded using the risk color system
A thin accent bar along the bottom edge of the card in the team's primary color (Arsenal = red, Chelsea = blue, Liverpool = red, Man City = sky blue, Tottenham = navy, etc)
On hover: card lifts up slightly, shadow deepens, subtle blue border appears
Clicking the card navigates to that team's player card view

Include 10 Premier League teams with realistic squad sizes and varied average injury risk values.
At the bottom of the home page: a simple league-style table showing all teams ranked by average injury risk (lowest to highest). Columns: Rank, Team, Squad Size, Average Risk (color-coded pill), Total Injuries This Season, Total Minutes Lost. Clean card-style table with rounded corners and row hover highlights.

VIEW 2 — TEAM VIEW (FIFA-Style Player Cards):
Top section:

Back arrow button (rounded-full, blue outline) + Team name as page title in bold charcoal (32px)
Below: three summary pills in a row — "Squad: 25 players", "Avg Injury Risk: 42%", "Total injuries: 14" — each in a rounded-full pill with light background

Main content — FIFA Card Carousel:
The center of the page features a large FIFA Ultimate Team inspired player card, displayed prominently. The card design:

Card size: approximately 320px wide by 450px tall
Rounded corners (24px), subtle outer glow/shadow
Card background: a clean gradient based on the player's risk level — soft blue gradient for low risk, teal gradient for moderate, warm orange gradient for elevated, red gradient for high risk. The gradient should be subtle and premium-feeling, not garish
Card top section: Player's last name in large bold white text (28px). Below it: position abbreviation and kit number in a small rounded pill. Club name in small muted white text
Card main stat — center: The injury risk percentage displayed huge and bold (72px, JetBrains Mono, white) as the "headline rating" like FIFA's overall rating. Below it the text "INJURY RISK" in tiny uppercase white mono text
Card stat grid — bottom section: A grid showing six key stats, laid out like FIFA card stats (three on the left, three on the right, or a 2x3 grid). Each stat has a small uppercase label and a bold number value. The six stats are:

AGE — player's age
GP (Games Played) — number this season
MIN (Minutes Played) — total this season, formatted with comma
INJ (Injuries) — number this season, colored red if 2+
MISSED (Minutes Missed) — due to injury this season
TREND — risk trend as arrow + percentage (↑12% or ↓8%), colored red for up, teal for down


Bottom of card: A thin divider line, then a row showing: nationality flag emoji + age + market value (e.g. "🏴 · 22 · €120M") in small white mono text
Favorite button: A star icon in the top-right corner of the card. Tapping toggles it between outline (not saved) and filled gold (★, #F59E0B = saved)

Card navigation:

Left and right arrow buttons on either side of the card (large, rounded-full, white with soft shadow, blue arrow icon inside). Clicking cycles through players on the team
Below the main card: a horizontal scrollable row of mini player cards (thumbnail versions, about 80px wide by 110px tall) showing just the player's last name and risk percentage with risk-colored background. The currently displayed player's mini card has a blue ring/border around it. Clicking any mini card jumps to that player
Mini cards are sorted by injury risk (highest first) by default
Above the mini card row: sort options as small clickable text links — "Sort by: Risk ↓ · Name · Position · Age" — active sort option in blue with underline

Optional detail expand:

Below the main card area: a "View Details" button (rounded-full, blue outline). Clicking it expands a section below showing:

A stat breakdown row: Avg Distance (km), Sprints/Match, Fouls Against/Match, Acute:Chronic Ratio, Days Since Last Injury, Match Density — in a horizontal scrollable row of small white stat cards
Injury history list: each entry showing date, diagnosis, anatomical region, duration, and severity badge (Mild=teal, Moderate=orange, Severe=red pill). Clean rows with subtle dividers
This section slides down with a smooth animation




RESPONSIVE BEHAVIOR:

Desktop: team grid is 4 columns, FIFA card is centered with arrows on sides, mini card row shows 8-10 visible
Tablet: team grid 3 columns, card slightly smaller
Mobile: team grid 2 columns, FIFA card takes full width with padding, arrows become swipe gestures, mini card row scrolls horizontally, expanded details stack vertically


MOCK DATA:
Include 10 Premier League teams (Arsenal, Chelsea, Liverpool, Manchester City, Tottenham, Manchester United, Newcastle, Aston Villa, Brighton, West Ham). Each team has 8-12 mock players with realistic names, ages, positions, nationalities, market values, and varied injury risk data. Make sure injury risks range from 8% to 85% across all players to fully showcase the color system. Include a mix of risk trends — some sharply increasing, some stable, some decreasing.
Build as a single-page React application with client-side routing between the home view and team view. All sorting, searching, filtering, and navigation should work with the hardcoded mock data. Use Tailwind CSS for styling.