---
layout: post
title: Messing Around with Networking
---

So, I'm not usually a network person. But for one of my projects, I have been working on building an Android app that can control a robot over a local network. The idea is that we will have an Android phone or tablet talking to a Ubuntu PC. I feel like this might be useful information for someone starting from scratch (like I am) so I figured I would post it online here.

Now, all that this requires is writing to and reading from sockets, which isn't terribly complicated.

In Python, opening and closing ports is handled with the [socket package](https://docs.python.org/2/library/socket.html). So it's pretty easy to write up a little server in python to run some tests:

```python
#!/usr/bin/env python

import socket

s = socket.socket()
host = socket.gethostname()
print "Hostname = ", host
port = 12321
s.bind((host,port))

s.listen(5)

while True:
    c, addr = s.accept()
    print 'Connection from', addr
    msg = c.recv(4096)
    print msg

    c.close()
```

And a client to go along with it:

```python
#!/usr/bin/env python

import socket

s = socket.socket()
host = socket.gethostname()
port = 12321
s.connect((host,port))
s.send('Test!')
```

With these two, whenever I run the client I will get output that looks like this:

```
Connection from ('127.0.0.1', 42337)
Test!
```

<p class="message">
When running these python scripts, note that if you want to want the port you are opening to be visible across the network you need to set the hostname to "0.0.0.0".
</p>

Nice, right? So let's try to write the Java version of that code. Java defines Socket in a similar way, so we could do something like this:

```java
Socket s = new Socket("localhost",12321);
```

If so, we will run into a couple problems with Android, though. For one thing, Android does not allow you do to any networking in the main thread: you'll get [this wonderful exception](http://developer.android.com/reference/android/os/NetworkOnMainThreadException.html). This issue is described pretty clearly [here](http://developer.android.com/training/basics/network-ops/connecting.html).

For another, we need to make sure you give your Android app the right permissions, as shown in this manifest file:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.mycompany.app" >

    <uses-permission android:name="android.permission.INTERNET"/>

    <application
        android:allowBackup="true"
        android:icon="@drawable/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/AppTheme" >
        <activity
            android:name=".MainActivity"
            android:label="@string/app_name" >
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />

                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
```

So, the core questions are:

  * How can I send the information I need between my server and the Android tablet?
  * Should I just be using something like [rosjava](https://github.com/rosjava/rosjava_core) since this is a robotics project?

I'll update on what we end up deciding soon!

