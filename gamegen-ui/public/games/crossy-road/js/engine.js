// engine.js

var Engine = (function(global) {
    var doc = global.document,
        win = global.window,
        canvas = doc.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        lastTime;

    canvas.width = 505;
    canvas.height = 606;
    doc.body.appendChild(canvas);

    function main() {
        var now = Date.now(),
            dt = (now - lastTime) / 1000.0;

        update(dt);
        render();

        lastTime = now;
        win.requestAnimationFrame(main);
    };

    function init() {
        // --- START OF CHANGES ---
        reset(); // Calls reset which will now trigger app.js's initialization
        // --- END OF CHANGES ---
        lastTime = Date.now();
        main();
    }

    function update(dt) {
        updateEntities(dt);
    }

    function updateEntities(dt) {
        // --- START OF CHANGES ---
        // Ensure allEnemies and player are defined before trying to loop/update
        if (global.allEnemies && Array.isArray(global.allEnemies)) {
            global.allEnemies.forEach(function(enemy) {
                if (enemy && typeof enemy.update === 'function') {
                    enemy.update(dt);
                } else {
                    console.warn("Invalid enemy object in allEnemies array:", enemy);
                }
            });
        } else {
            console.warn("allEnemies array is not defined or not an array:", global.allEnemies);
        }

        if (global.player && typeof global.player.update === 'function') {
            global.player.update();
        } else {
            console.warn("Player object not defined or update method missing:", global.player);
        }
        // --- END OF CHANGES ---
    }

    function render() {
        var rowImages = [
                'images/water-block.png',
                'images/stone-block.png',
                'images/stone-block.png',
                'images/stone-block.png',
                'images/grass-block.png',
                'images/grass-block.png'
            ],
            numRows = 6,
            numCols = 5,
            row, col;

        for (row = 0; row < numRows; row++) {
            for (col = 0; col < numCols; col++) {
                ctx.drawImage(Resources.get(rowImages[row]), col * 101, row * 83);
            }
        }
        renderEntities();
    }

    function renderEntities() {
        // --- START OF CHANGES ---
        // Ensure allEnemies and player are defined before trying to loop/render
        if (global.allEnemies && Array.isArray(global.allEnemies)) {
            global.allEnemies.forEach(function(enemy) {
                if (enemy && typeof enemy.render === 'function') {
                    enemy.render();
                } else {
                    // console.warn("Invalid enemy object in allEnemies array for rendering:", enemy);
                }
            });
        }

        if (global.player && typeof global.player.render === 'function') {
            global.player.render();
        } else {
            // console.warn("Player object not defined or render method missing for rendering:", global.player);
        }
        // --- END OF CHANGES ---
    }

    function reset() {
        // --- START OF CHANGES ---
        // This is where we call app.js's initialization function
        if (typeof global.appInitializeGame === 'function') {
            global.appInitializeGame();
            console.log("Crossy Road Game: appInitializeGame called from engine.js reset().");
        } else {
            console.error("Crossy Road Game: appInitializeGame function not found on window object!");
        }
        // --- END OF CHANGES ---
    }

    Resources.load([
        'images/stone-block.png',
        'images/water-block.png',
        'images/grass-block.png',
        'images/enemy-bug.png',
        'images/char-boy.png'
    ]);
    Resources.onReady(init);

    global.ctx = ctx;
})(this);