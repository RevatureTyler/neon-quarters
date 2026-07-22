;(function() {
  var BLOCK_SIZE = 10;

  var Game = function() {
    var screen = document.getElementById("screen").getContext('2d');

    this.size = { x: screen.canvas.width, y: screen.canvas.height };
    this.center = { x: this.size.x / 2, y: this.size.y / 2 };
    this.keyboarder = new Keyboarder();
    this.reset();

    var self = this;
    var tick = function() {
      self.update();
      self.draw(screen);
      requestAnimationFrame(tick);
    };

    tick();
  };

  Game.prototype = {
    reset: function() {
      this.state = 'playing';
      this.bodies = createWalls(this).concat(new HeadBlock(this));
      this.addFood();
    },

    update: function() {
      if (this.state !== 'playing') {
        if (this.keyboarder.isDown(this.keyboarder.KEYS.R)) {
          this.reset();
        }
        return;
      }

      for (var i = 0; i < this.bodies.length; i++) {
        if (this.bodies[i].update !== undefined) {
          this.bodies[i].update();
        }
      }

      reportCollisions(this.bodies);
    },

    gameOver: function() {
      this.state = 'gameover';
    },

    draw: function(screen) {
      // Fill a dark background instead of leaving the canvas transparent:
      // the original relied on the page's white background to make its
      // black-filled blocks visible, which turns invisible against a dark
      // page (like this site's game player).
      screen.fillStyle = '#0b0e14';
      screen.fillRect(0, 0, this.size.x, this.size.y);
      for (var i = 0; i < this.bodies.length; i++) {
        this.bodies[i].draw(screen);
      }

      if (this.state !== 'playing') {
        drawMessage(screen, this.size);
      }
    },

    addBody: function(body) {
      this.bodies.push(body);
    },

    removeBody: function(body) {
      var bodyIndex = this.bodies.indexOf(body);
      if (bodyIndex !== -1) {
        this.bodies.splice(bodyIndex, 1);
      }
    },

    isSquareFree: function(center) {
      return this.bodies.filter(function(b) {
        return isColliding(b, { center: center, size: { x: BLOCK_SIZE, y: BLOCK_SIZE }});
      }).length === 0;
    },

    randomSquare: function() {
      return {
        x: Math.floor(this.size.x / BLOCK_SIZE * Math.random()) * BLOCK_SIZE + BLOCK_SIZE / 2,
        y: Math.floor(this.size.y / BLOCK_SIZE * Math.random()) * BLOCK_SIZE + BLOCK_SIZE / 2
      };
    },

    addFood: function() {
      this.addBody(new FoodBlock(this));
    }
  };

  var drawMessage = function(screen, size) {
    screen.fillStyle = 'rgba(11, 14, 20, 0.75)';
    screen.fillRect(0, size.y / 2 - 32, size.x, 64);

    screen.textAlign = 'center';
    screen.fillStyle = '#ff3e9a';
    screen.font = 'bold 20px sans-serif';
    screen.fillText('GAME OVER', size.x / 2, size.y / 2 - 4);

    screen.fillStyle = '#d7e0e8';
    screen.font = '12px sans-serif';
    screen.fillText('press R to try again', size.x / 2, size.y / 2 + 18);
  };

  var WallBlock = function(game, center, size) {
    this.game = game;
    this.center = center;
    this.size = size;
  };

  WallBlock.prototype = {
    draw: function(screen) {
      drawRect(screen, this, "#7c8896");
    }
  };

  var FoodBlock = function(game) {
    this.game = game;

    while (this.center === undefined) {
      var center = this.game.randomSquare();
      if (this.game.isSquareFree(center)) {
        this.center = center;
      }
    }

    this.size = { x: BLOCK_SIZE, y: BLOCK_SIZE };
  };

  FoodBlock.prototype = {
    draw: function(screen) {
      drawRect(screen, this, "#ff3e9a");
    },

    collision: function(otherBody) {
      if (otherBody instanceof HeadBlock) {
        this.game.removeBody(this);
      }
    }
  };

  var BodyBlock = function(game, center) {
    this.game = game;
    this.center = center;
    this.size = { x: BLOCK_SIZE, y: BLOCK_SIZE };
  };

  BodyBlock.prototype = {
    draw: function(screen) {
      drawRect(screen, this, "#5ee6d9");
    }
  };

  var HeadBlock = function(game) {
    this.game = game;
    this.center = { x: this.game.center.x, y: this.game.center.y };
    this.direction = { x: 1, y: 0 };
    this.size = { x: BLOCK_SIZE, y: BLOCK_SIZE };
    this.blocks = [];

    this.lastMove = 0;

    this.addBlock = false;
  };

  HeadBlock.prototype = {
    update: function() {
      this.handleKeyboard();

      var now = new Date().getTime();
      if (now > this.lastMove + 100) {
        this.move();
        this.lastMove = now;
      }
    },

    draw: function(screen) {
      drawRect(screen, this, "#ffb627");
    },

    collision: function(otherBody) {
      if (otherBody instanceof WallBlock || otherBody instanceof BodyBlock) {
        this.die();
      } else if (otherBody instanceof FoodBlock) {
        this.eat();
      }
    },

    handleKeyboard: function() {
      var keyboarder = this.game.keyboarder;

      if (keyboarder.isDown(keyboarder.KEYS.LEFT) &&
          this.direction.x !== 1) {
        this.direction.x = -1;
        this.direction.y = 0;
      } else if (keyboarder.isDown(keyboarder.KEYS.RIGHT) &&
                 this.direction.x !== -1) {
        this.direction.x = 1;
        this.direction.y = 0;
      }

      if (keyboarder.isDown(keyboarder.KEYS.UP) &&
          this.direction.y !== 1) {
        this.direction.y = -1;
        this.direction.x = 0;
      } else if (keyboarder.isDown(keyboarder.KEYS.DOWN) &&
                 this.direction.y !== -1) {
        this.direction.y = 1;
        this.direction.x = 0;
      }
    },

    move: function() {
      var prevBlockCenter = { x: this.center.x, y: this.center.y };
      this.center.x += this.direction.x * BLOCK_SIZE;
      this.center.y += this.direction.y * BLOCK_SIZE;

      if (this.addBlock === true) {
        var block = new BodyBlock(this.game, prevBlockCenter);
        this.game.addBody(block);
        this.blocks.push(block);
        this.addBlock = false;
      }

      for (var i = 0; i < this.blocks.length; i++) {
        var oldCenter = this.blocks[i].center;
        this.blocks[i].center = { x: prevBlockCenter.x, y: prevBlockCenter.y };
        prevBlockCenter = oldCenter;
      }
    },

    eat: function() {
      this.addBlock = true;
      this.game.addFood();
    },

    die: function() {
      this.game.gameOver();
    }
  };

  var Keyboarder = function() {
    var keyState = {};

    window.addEventListener('keydown', function(e) {
      keyState[e.keyCode] = true;
    });

    window.addEventListener('keyup', function(e) {
      keyState[e.keyCode] = false;
    });

    this.isDown = function(keyCode) {
      return keyState[keyCode] === true;
    };

    this.KEYS = { LEFT: 37, RIGHT: 39, UP: 38, DOWN: 40, R: 82 };
  };

  var isColliding = function(b1, b2) {
    return !(
      b1 === b2 ||
        b1.center.x + b1.size.x / 2 <= b2.center.x - b2.size.x / 2 ||
        b1.center.y + b1.size.y / 2 <= b2.center.y - b2.size.y / 2 ||
        b1.center.x - b1.size.x / 2 >= b2.center.x + b2.size.x / 2 ||
        b1.center.y - b1.size.y / 2 >= b2.center.y + b2.size.y / 2
    );
  };

  var reportCollisions = function(bodies) {
    var collisions = [];
    for (var i = 0; i < bodies.length; i++) {
      for (var j = i + 1; j < bodies.length; j++) {
        if (isColliding(bodies[i], bodies[j])) {
          collisions.push([bodies[i], bodies[j]]);
        }
      }
    }

    for (var i = 0; i < collisions.length; i++) {
      if (collisions[i][0].collision !== undefined) {
        collisions[i][0].collision(collisions[i][1]);
      }

      if (collisions[i][1].collision !== undefined) {
        collisions[i][1].collision(collisions[i][0]);
      }
    }
  };

  var createWalls = function(game) {
    var walls = [];
    walls.push(new WallBlock(game,
                             { x: game.center.x, y: BLOCK_SIZE / 2 },
                             { x: game.size.x, y: BLOCK_SIZE })); // top

    walls.push(new WallBlock(game,
                             { x: game.size.x - BLOCK_SIZE / 2, y: game.center.y },
                             { x: BLOCK_SIZE, y: game.size.y - BLOCK_SIZE * 2 })); // right

    walls.push(new WallBlock(game,
                             { x: game.center.x, y: game.size.y - BLOCK_SIZE / 2 },
                             { x: game.size.x, y: BLOCK_SIZE })); // bottom

    walls.push(new WallBlock(game,
                             { x: BLOCK_SIZE / 2, y: game.center.y },
                             { x: BLOCK_SIZE, y: game.size.y - BLOCK_SIZE * 2 })); // left
    return walls;
  };

  var drawRect = function(screen, body, color) {
    screen.fillStyle = color;
    screen.fillRect(body.center.x - body.size.x / 2, body.center.y - body.size.y / 2,
                    body.size.x, body.size.y);
  };

  window.addEventListener('load', function() {
    new Game();
  });
})(this);
