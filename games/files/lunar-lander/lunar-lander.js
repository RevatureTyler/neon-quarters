;(function() {
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
      this.bodies = createMountains(this).concat(new Player(this));
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

    crash: function() {
      this.state = 'crashed';
    },

    land: function() {
      this.state = 'landed';
    },

    draw: function(screen) {
      // Fill a dark space background instead of leaving the canvas
      // transparent: the original relied on the page's white background to
      // make its black line art visible, which turns invisible against a
      // dark page (like this site's game player).
      screen.fillStyle = '#05070c';
      screen.fillRect(0, 0, this.size.x, this.size.y);
      for (var i = 0; i < this.bodies.length; i++) {
        this.bodies[i].draw(screen);
      }

      if (this.state !== 'playing') {
        drawMessage(screen, this.size, this.state);
      }
    },

    removeBody: function(body) {
      var bodyIndex = this.bodies.indexOf(body);
      if (bodyIndex !== -1) {
        this.bodies.splice(bodyIndex, 1);
      }
    }
  };

  var drawMessage = function(screen, size, state) {
    var title = state === 'crashed' ? 'CRASHED' : 'LANDED SAFELY';
    var color = state === 'crashed' ? '#ff3e9a' : '#5ee6d9';

    screen.fillStyle = 'rgba(5, 7, 12, 0.75)';
    screen.fillRect(0, size.y / 2 - 32, size.x, 64);

    screen.textAlign = 'center';
    screen.fillStyle = color;
    screen.font = 'bold 20px sans-serif';
    screen.fillText(title, size.x / 2, size.y / 2 - 4);

    screen.fillStyle = '#d7e0e8';
    screen.font = '12px sans-serif';
    screen.fillText('press R to try again', size.x / 2, size.y / 2 + 18);
  };

  var MountainLine = function(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
  };

  MountainLine.prototype = {
    draw: function(screen) {
      drawLine(screen, this, 1, '#7c8896');
    }
  };

  var Line = function(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
  };

  var LandingPadLine = function(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
  };

  LandingPadLine.prototype = {
    draw: function(screen) {
      drawLine(screen, this, 2, '#ff3e9a');
    }
  };

  var Player = function(game) {
    this.game = game;
    var h = 5;
    var w = 5;

    this.angle = 0;
    var c = this.center = { x: this.game.center.x, y: h * 3 };

    this.boostLines = [
      new Line({ x: c.x - w, y: c.y + h * 3 }, { x: c.x, y: c.y + h * 3 }),
      new Line({ x: c.x + w, y: c.y + h * 3 }, { x: c.x, y: c.y + h * 3 })
    ];

    this.baseLine = new Line({ x: c.x - w, y: c.y + h * 3 },
                             { x: c.x + w, y: c.y + h * 3 });

    this.hullLines = [
      new Line({ x: c.x, y: c.y - h }, { x: c.x + w, y: c.y + h * 3 }),
      new Line({ x: c.x - w, y: c.y + h * 3 }, { x: c.x, y: c.y - h })
    ];

    this.lines = this.hullLines.concat(this.baseLine);

    this.boosting = false;
    this.velocity = { x: 0, y: 0 };
  };

  Player.prototype = {
    update: function() {
      this.applyGravity();
      this.applyBoost();

      this.center = geom.translate(this.center, this.velocity);
      this.allLines().forEach(function(l) {
        l.p1 = geom.translate(l.p1, this.velocity);
        l.p2 = geom.translate(l.p2, this.velocity);
      }, this);

      this.handleKeyboard();
    },

    draw: function(screen) {
      var lines = this.hullLines.concat(this.baseLine);
      for (var li = 0; li < lines.length; li++) {
        drawLine(screen, lines[li], 1, '#5ee6d9');
      }
      for (var bi = 0; bi < this.boostLines.length; bi++) {
        drawLine(screen, this.boostLines[bi], 2, '#ffb627');
      }
    },

    allLines: function() {
      return this.hullLines.concat(this.boostLines).concat(this.baseLine);
    },

    applyGravity: function() {
      var landed = this.game.bodies.filter(function(b) {
        return b instanceof LandingPadLine && isColliding(this.baseLine, b);
      }, this).length === 1;

      if (landed === false) {
        this.velocity.y += 0.002;
      }
    },

    applyBoost: function() {
      if (this.boosting === true) {
        this.velocity = geom.translate(this.velocity,
                                       geom.rotate({ x: 0, y: -0.004 },
                                                   { x: 0, y: 0 },
                                                   this.angle));
      }
    },

    handleKeyboard: function() {
      var keyboarder = this.game.keyboarder;

      if (keyboarder.isDown(keyboarder.KEYS.LEFT)) {
        this.rotate(-0.07);
      } else if (keyboarder.isDown(keyboarder.KEYS.RIGHT)) {
        this.rotate(0.07);
      }

      if (keyboarder.isDown(keyboarder.KEYS.UP) && this.boosting === false) {
        this.boosting = true;
        var boostPointOffset = geom.rotate({ x: 0, y: 10 }, { x: 0, y: 0 }, this.angle);
        this.boostLines.forEach(function(l) {
          l.p2 = geom.translate(l.p2, boostPointOffset);
        });
      } else if (keyboarder.isDown(keyboarder.KEYS.DOWN) && this.boosting === true) {
        this.boosting = false;
        var boostPointOffset = geom.rotate({ x: 0, y: -10 }, { x: 0, y: 0 }, this.angle);
        this.boostLines.forEach(function(l) {
          l.p2 = geom.translate(l.p2, boostPointOffset);
        });
      }
    },

    collision: function(otherBody) {
      if (this.isAtRightAngleForLanding() &&
          otherBody instanceof LandingPadLine && isColliding(this.baseLine, otherBody)) {
        this.velocity = { x: 0, y: 0 };
        this.game.land();
      } else if (otherBody instanceof MountainLine || otherBody instanceof LandingPadLine) {
        this.velocity = { x: 0, y: 0 };
        this.game.crash();
      }
    },

    isAtRightAngleForLanding: function() {
      var angle = this.angle / 0.01745 + 90;
      return (angle > 80 && angle < 100) || (angle > 260 && angle < 280);
    },

    rotate: function(angleChange) {
      this.angle += angleChange;
      this.allLines().forEach(function(l) {
        l.p1 = geom.rotate(l.p1, this.center, angleChange);
        l.p2 = geom.rotate(l.p2, this.center, angleChange);
      }, this);
    },
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

  var drawLine = function(screen, line, lineWidth, color) {
    screen.beginPath();
    screen.lineWidth = lineWidth;
    screen.strokeStyle = color || '#d7e0e8';
    screen.moveTo(line.p1.x, line.p1.y);
    screen.lineTo(line.p2.x, line.p2.y);
    screen.stroke();
  };

  var anyLinesIntersecting = function(lines1, lines2) {
    for (var i = 0; i < lines1.length; i++) {
      for (var j = 0; j < lines2.length; j++) {
        if (geom.linesIntersecting(lines1[i], lines2[j])) {
          return true;
        }
      }
    }

    return false;
  };

  var isColliding = function(b1, b2) {
    var lines1 = b1.lines ? b1.lines : [b1];
    var lines2 = b2.lines ? b2.lines : [b2];
    return anyLinesIntersecting(lines1, lines2);
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

  var createMountains = function(game) {
    var lines = [];

    var w = game.size.x;
    var h = game.size.y;

    var ordinate = function(min, max) {
      return min + (max - min) * Math.random();
    };

    var p1 = { x: 0, y: ordinate(h * 0.7, h) };
    while (p1.x < w) {
      if ((3 + lines.length) % 4 === 0) {
        var p2 = { x: p1.x + ordinate(30, 40), y: p1.y + Math.random() - 0.5 };
        lines.push(new LandingPadLine(p1, p2));
      } else {
        var p2 = { x: p1.x + ordinate(30, 40), y: ordinate(h * 0.7, h) };
        lines.push(new MountainLine(p1, p2));
      }

      p1 = p2;
    }

    return lines;
  };

  var geom = {
    translate: function(point, translation) {
      return { x: point.x + translation.x, y: point.y + translation.y };
    },

    rotate: function(point, pivot, angle) {
      return {
        x: (point.x - pivot.x) * Math.cos(angle) -
          (point.y - pivot.y) * Math.sin(angle) +
          pivot.x,
        y: (point.x - pivot.x) * Math.sin(angle) +
          (point.y - pivot.y) * Math.cos(angle) +
          pivot.y
      };
    },

    linesIntersecting: function(a, b) {
      var d = (b.p2.y - b.p1.y) * (a.p2.x - a.p1.x) -
          (b.p2.x - b.p1.x) * (a.p2.y - a.p1.y);
      var n1 = (b.p2.x - b.p1.x) * (a.p1.y - b.p1.y) -
          (b.p2.y - b.p1.y) * (a.p1.x - b.p1.x);
      var n2 = (a.p2.x - a.p1.x) * (a.p1.y - b.p1.y) -
          (a.p2.y - a.p1.y) * (a.p1.x - b.p1.x);

      if (d === 0.0) return false;
      return n1 / d >= 0 && n1 / d <= 1 && n2 / d >= 0 && n2 / d <= 1;
    }
  };

  window.addEventListener('load', function() {
    new Game();
  });
})(this);
