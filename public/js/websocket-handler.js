const { redis, pub } = require('./redis-config');

const REDIS_CHANNEL = 'whiteboard-updates';
const DRAWING_TTL = 0; // Set to 0 for no expiration - this is the key change!

module.exports = function handleWebSocket(io) {
  io.on('connection', async (socket) => {
    const whiteboardId = socket.handshake.query.whiteboardId;
    console.log(`Client connected to whiteboard: ${whiteboardId}`);
    
    socket.join(whiteboardId);
    
    // Create Redis subscriber with error handling
    const redisSubscriber = redis.duplicate();
    const channel = `${REDIS_CHANNEL}:${whiteboardId}`;
    
    try {
      await redisSubscriber.subscribe(channel);
      console.log(`Subscribed to channel: ${channel}`);
    } catch (err) {
      console.error('Redis subscription error:', err);
      socket.emit('error', 'Failed to initialize whiteboard sync');
      return;
    }
    
    redisSubscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        socket.to(whiteboardId).emit('drawUpdate', data);
      } catch (err) {
        console.error('Error processing Redis message:', err);
      }
    });

    socket.on('draw', async (data) => {
      try {
        const drawingKey = `whiteboard:${whiteboardId}:drawings`;
        
        // Store the drawing permanently
        await redis.rpush(drawingKey, JSON.stringify(data));
        await pub.publish(channel, JSON.stringify(data));
      } catch (err) {
        console.error('Error handling draw event:', err);
        socket.emit('error', 'Failed to save drawing');
      }
    });

    socket.on('loadWhiteboard', async () => {
      try {
        const drawingKey = `whiteboard:${whiteboardId}:drawings`;
        const drawings = await redis.lrange(drawingKey, 0, -1);
        socket.emit('initWhiteboard', drawings.map(d => JSON.parse(d)));
      } catch (err) {
        console.error('Error loading whiteboard:', err);
        socket.emit('error', 'Failed to load whiteboard');
      }
    });

    socket.on('clearWhiteboard', async () => {
      try {
        const drawingKey = `whiteboard:${whiteboardId}:drawings`;
        await redis.del(drawingKey);
        io.to(whiteboardId).emit('whiteboardCleared');
      } catch (err) {
        console.error('Error clearing whiteboard:', err);
        socket.emit('error', 'Failed to clear whiteboard');
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected from whiteboard: ${whiteboardId}`);
      redisSubscriber.unsubscribe(channel)
        .then(() => redisSubscriber.quit())
        .catch(err => console.error('Error disconnecting Redis subscriber:', err));
    });
  });
};
