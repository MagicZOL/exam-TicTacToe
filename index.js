var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const uuidv4 = require('uuid/v4');

var rooms = [];

const maxClient = 2;

io.on('connection', function(socket)
{
    console.log('Connect');

    var NewRoom = function()
    {
        var roomId = uuidv4();
        socket.join(roomId, function()
        {
            var room = { roomId: roomId, users: [{ userId : socket.id, ready : false}] };
            rooms.push(room);

            socket.emit("server_in", {roomId : roomId});
        });
    }

    var availableRoom = function()
    {
        if(rooms.length > 0)
        {
            for (var i=0; i< rooms.length; i++)
            {
                if(rooms[i].users.length < maxClient)
                {
                    return i;
                }
            }
        }
        return -1;
    }

    var roomIndex = availableRoom();
    if(roomIndex > -1)
    {
        socket.join(rooms[roomIndex].roomId, function()
        {
            var user = {userId : socket.id, ready : false}
            rooms[roomIndex].users.push(user);

            socket.emit("server_in", {roomId : rooms[roomIndex].roomId, userId : socket.id});
        });
    }
    else
    {
        NewRoom();
    }

    socket.on("client_ready", function(data)
    {
        if(!data) return;

        var room = rooms.find(room => room.roomId === data.roomId)

        if(room)
        {
            var users = room.users;
            var user = users.find(user => user.userId === data.userId)
            if(user) user.ready = true;
            
            if(users.length == maxClient)
            {
                var count = 0;
                for(var i=0; i<users.length; i++)
                {
                    if(users[i].ready == true)
                    {
                        count++;
                    }
                }
                if(users.length == count)
                {
                    var randomPeople = getRandom();
                    var anotherPeople;

                    if(randomPeople == 0)
                    {
                        anotherPeople = 1;    
                    }
                    else
                    {
                        anotherPeople = 0;
                    }
                    io.to(users[randomPeople].userId).emit('server_gamestart', {first : true});
                    io.to(users[anotherPeople].userId).emit('server_gamestart', {first : false});
                }
            }
        }
    });

    var getRandom = function() 
    {
        return Math.random();
    }

    socket.on('client_cellclick', function(data)
    {
        if(!data) return;
        var cellIndex = data.cellIndex;
        var roomId = data.roomId;

        if(cellIndex > -1 && roomId)
        {
            socket.to(roomId).emit('server_cellclick', {cellIndex : cellIndex});
        }
    });

    socket.on('client_winner', function(data)
    {
        if(!data) return;
        var cellIndex = data.cellIndex;
        var roomId = data.roomId;

        if(cellIndex > -1 && roomId)
        {
            socket.to(roomId).emit('server_lose', {cellIndex : cellIndex});

            gameExit();
        }
    });

    socket.on('client_draw', function(data)
    {
        if(!data) return;
        var cellIndex = data.cellIndex;
        var roomId = data.roomId;

        if(cellIndex > -1 && roomId)
        {
            socket.to(roomId).emit('server_draw', {cellIndex : cellIndex});
            
            gameExit();
        }
    });

    socket.on('disconnect', function(reason)
    {
        console.log("disconnect");
            var room = rooms.find(room => room.users.find(user => user.userId === socket.id));

            if(room)
            {
                socket.leave(room.roomId, function()
                {
                    var users = room.users;
                    var user = users.find(user => user.userId === socket.id);
                    users.splice(users.indexOf(user), 1);

                    if(users.length == 0)
                    {
                        rooms.splice(rooms.indexOf(room), 1);
                    }
                    else
                    {
                        socket.to(room.roomId).emit('server_otheruserexit', {otheruserId : socket.io});
                        rooms.splice(rooms.indexOf(room), 1);
                    }
                });
            }
    });

    var gameExit = function()
    {
        var users = room.users;

        users.splice(users[0], maxClient);

        if (users.length == 0) 
        {
            rooms.splice(rooms.indexOf(room), 1);
        }
    }
});

http.listen(3000, function ()
{
    console.log('listening On : 3000')
});