function AITrainer(){

    this.AIPolicy = new AIPolicy();

}

AITrainer.prototype.init = function(state, gamePolicy){

    AI.opponents = [];
    AI.currentOpponent = new Opponent();
    AI.finishedSession = true;
    AI.iteration = 0;

    AI.bestOpponentIndex = 0;
    AI.bestOpponentEval = 0;

    if(gamePolicy.foul){
        //TO DO: Pick best position for the white ball.
        state.whiteBall.position.x = 413;
        state.whiteBall.position.y = 413;
        state.whiteBall.inHole = false;
        gamePolicy.foul = false;
    }
    AI.initialState = JSON.parse(JSON.stringify(state));
    AI.initialGamePolicyState = JSON.parse(JSON.stringify(gamePolicy));

    AI.state = state;
    AI.gamePolicy = gamePolicy;

}

AITrainer.prototype.train = function(){

    if(AI.iteration === TRAIN_ITER){
        AI.finishedSession = true;
        AI.playTurn();
        return;
    }

    let ballsMoving = AI.state.ballsMoving();

    if(!ballsMoving){

        if(AI.iteration !== 0){
            AI.currentOpponent.evaluation = AI.AIPolicy.evaluate(this.state, this.gamePolicy);

            AI.opponents.push(JSON.parse(JSON.stringify(AI.currentOpponent)));

            if(AI.currentOpponent.evaluation > AI.bestOpponentEval){
                AI.bestOpponentEval = AI.currentOpponent.evaluation;
                AI.bestOpponentIndex =  AI.opponents.length - 1;
            }

            if(LOG){
                console.log('-------------'+new Number(AI.iteration+1)+'--------------------');
                console.log('Current evaluation: ' + AI.currentOpponent.evaluation);
                console.log('Current power: ' + AI.currentOpponent.power);
                console.log('Current rotation: ' + AI.currentOpponent.rotation);
                console.log('---------------------------------');
            }
        }

        AI.state.initiateState(AI.initialState.balls);
        AI.gamePolicy.initiateState(AI.initialGamePolicyState);
        AI.buildNewOpponent();
        AI.simulate();
    }

}

AITrainer.prototype.buildNewOpponent = function(){

    if(AI.iteration % 10 === 0){
        AI.currentOpponent = new Opponent();
        AI.iteration++;
        return;
    }

    let bestOpponent = AI.opponents[AI.bestOpponentIndex];

    let newPower = bestOpponent.power;
    newPower += + ((Math.random() * 30) - 15);
    newPower = newPower < 20 ? 20 : newPower;
    newPower = newPower > 75 ? 75 : newPower;

    let newRotation = bestOpponent.rotation;

    if(bestOpponent.evaluation > 0){
        newRotation += (1/bestOpponent.evaluation)*(Math.random() * 2 * Math.PI - Math.PI)
    }
    else{
        newRotation = (Math.random() * 2 * Math.PI - Math.PI);
    }

    AI.currentOpponent = new Opponent(newPower,newRotation);

    AI.iteration++;

}

AITrainer.prototype.simulate = function(){
    AI.state.stick.shoot(AI.currentOpponent.power, AI.currentOpponent.rotation);
}

// Smallest signed angle (radians) to rotate `from` by to reach `to`, so an
// animated sweep always takes the short way around instead of potentially
// spinning most of the way around the circle.
function shortestAngleDelta(from, to){
    var delta = (to - from) % (2 * Math.PI);
    if (delta < -Math.PI) delta += 2 * Math.PI;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    return delta;
}

AITrainer.prototype.playTurn = function(){

    bestOpponent = AI.opponents[AI.bestOpponentIndex];

    // Restore the real table state and resume rendering *before* animating,
    // so the cue stick visibly sweeps into its aim on screen instead of
    // snapping there instantly while the game was still paused.
    Game.sound = true;
    Game.gameWorld.initiateState(AI.initialState.balls);
    Game.policy.initiateState(AI.initialGamePolicyState);

    var stick = Game.gameWorld.stick;
    stick.visible = true;
    stick.trackMouse = false;

    DISPLAY = true;
    requestAnimationFrame(Game.mainLoop);

    AI.animateAim(stick, bestOpponent, performance.now(), stick.rotation);
}

// Eases the cue stick's rotation from its current angle to the chosen shot
// angle over AIM_DURATION ms, pauses briefly as if lining up the shot, then
// fires. Runs on its own requestAnimationFrame loop so it stays smooth and
// frame-rate independent regardless of what the main game loop is doing.
AITrainer.prototype.animateAim = function(stick, opponent, startTime, startRotation){
    var AIM_DURATION = 700;
    var PAUSE_DURATION = 350;

    var elapsed = performance.now() - startTime;
    var t = Math.min(elapsed / AIM_DURATION, 1);
    var eased = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;

    stick.rotation = startRotation + shortestAngleDelta(startRotation, opponent.rotation) * eased;

    if (t < 1) {
        requestAnimationFrame(function(){
            AI.animateAim(stick, opponent, startTime, startRotation);
        });
        return;
    }

    stick.rotation = opponent.rotation;

    setTimeout(function(){
        stick.trackMouse = true;
        stick.shoot(opponent.power, opponent.rotation);
    }, PAUSE_DURATION);
};

AITrainer.prototype.opponentTrainingLoop = function(){

    Game.sound = false;
    DISPLAY = false;

    if(DISPLAY_TRAINING){
        if(!AI.finishedSession){
            AI.train();
            Game.gameWorld.handleInput(DELTA);
            Game.gameWorld.update(DELTA);
            Canvas2D.clear();
            Game.gameWorld.draw();
            Mouse.reset();
            setTimeout(AI.opponentTrainingLoop,0.00000000001);
        }
    }
    else{
        while(!AI.finishedSession){
            AI.train();
            Game.gameWorld.handleInput(DELTA);
            Game.gameWorld.update(DELTA);
            Mouse.reset();
        }
    }

}

AITrainer.prototype.startSession = function(){
        setTimeout(
            ()=>{
                Game.gameWorld.stick.visible = false;
                Canvas2D.clear();
                Game.gameWorld.draw();

                AI.init(Game.gameWorld, Game.policy);
                AI.finishedSession = false;
                AI.opponentTrainingLoop();
            },
            1000
        );
}

const AI = new AITrainer();