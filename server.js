const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const AWS = require('aws-sdk');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 80;

// Configure AWS SDK
AWS.config.update({
    region: 'eu-west-2',
    credentials: new AWS.EC2MetadataCredentials({
        httpOptions: { timeout: 5000 },
        maxRetries: 10
    })
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const whiteboardId = 'myNewWhiteboard';

// Function to load drawings from DynamoDB
const loadWhiteboardFromDynamo = async () => {
    const params = {
        TableName: 'Whiteboards',
        KeyConditionExpression: 'whiteboardId = :whiteboardId',
        ExpressionAttributeValues: {
            ':whiteboardId': whiteboardId
        }
    };
    console.log('Reading from DynamoDB with params:', params);
    try {
        const result = await dynamoDB.query(params).promise();
        console.log('Read result:', result);
        if (result.Items) {
            return result.Items.map(item => ({
                t: item.tool,
                d: item.data,
                c: item.color,
                th: item.thickness,
                username: item.username,
                drawId: parseInt(item.drawId, 10),
                wid: item.whiteboardId
            }));
        }
        return [];
    } catch (error) {
        console.error(`Error loading whiteboard from DynamoDB for whiteboardId: ${whiteboardId}`, error);
        return [];
    }
};

// Function to save a drawing to DynamoDB
const saveDrawingToDynamo = async (drawing) => {
    // Ensure drawId is defined and convert it to a string
    const drawId = drawing.drawId !== undefined ? drawing.drawId.toString() : '0'; // Default to '0' if undefined

    const params = {
        TableName: 'Whiteboards',
        Item: {
            whiteboardId: drawing.wid,
            drawId: drawId,
            tool: drawing.t,
            data: drawing.d,
            color: drawing.c,
            thickness: drawing.th,
            username: drawing.username,
            timestamp: Date.now().toString()
        }
    };
    console.log('Writing to DynamoDB:', params);
    try {
        await dynamoDB.put(params).promise();
        console.log(`Successfully saved drawing for whiteboardId: ${drawing.wid}`);
    } catch (error) {
        console.error(`Error saving drawing to DynamoDB for whiteboardId: ${drawing.wid}`, error);
    }
};

io.on('connection', async (socket) => {
    console.log(`Client connected to whiteboard: ${whiteboardId}`);
    socket.join(whiteboardId);

    // Load existing drawings from DynamoDB and send to the client
    const drawings = await loadWhiteboardFromDynamo();
    socket.emit('loadWhiteboard', drawings);

    socket.on('draw', async (data) => {
        try {
            console.log('Received draw event:', data);
            socket.to(whiteboardId).emit('drawUpdate', data);
            await saveDrawingToDynamo(data); // Save each drawing immediately
        } catch (err) {
            console.error('Error handling draw event:', err);
            socket.emit('error', 'Failed to save drawing');
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected from whiteboard: ${whiteboardId}`);
    });
});

app.use(express.static(path.join(__dirname, 'public')));

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
