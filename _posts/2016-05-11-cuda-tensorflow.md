---
layout: post
title: Setting up CUDA and TensorFlow
---

Google's TensorFlow is a popular tool kit for deep learning. The current release as of this post is [0.8.0](https://github.com/tensorflow/tensorflow/releases/tag/v0.8.0). Installing TensorFlow and getting everything working is pretty straightforward (the website itself is a [good place to start](https://www.tensorflow.org/versions/r0.8/get_started/os_setup.html)) but I thought I would add a couple notes of my own relating to setup of the [CUDA dependencies for TensorFlow](https://www.tensorflow.org/versions/r0.8/get_started/os_setup.html#optional-install-cuda-gpus-on-linux) on Ubuntu 14.04

You can download the files from [here](https://developer.nvidia.com/cuda-downloads) (Ubuntu 14.04 64-bit [here](http://developer.download.nvidia.com/compute/cuda/7.5/Prod/local_installers/cuda_7.5.18_linux.run). From here on out I will assume you are using 64-bit Ubuntu 14.04; this is a pretty safe assumption for anyone working with ROS like I am. Run with:

```
sudo sh cuda_7.5.18_linux.run
```

**Important:** if you want to install the accelerated driver, make sure you purge your existing Nvidia drivers first. They will conflict, and you will not be able to start your machine. For me, I had ``nvidia-352`` installed, so I was able to avoid this just by running ``sudo apt-get purge nvidia-352``.

Once everything is installed, you still need to add CUDA to your library path.

```
export PATH=/usr/local/cuda-7.5/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/cuda-7.5/lib64:$LD_LIBRARY_PATH
```

You can make and build the CUDA examples. In particular, you can run ``deviceQuery`` to test your graphics card and make sure you see a CUDA-compatible card. For example:

```
./bin/x86_64/linux/release/deviceQuery Starting...

 CUDA Device Query (Runtime API) version (CUDART static linking)

Detected 1 CUDA Capable device(s)

Device 0: "GeForce GTX 760"
  CUDA Driver Version / Runtime Version          7.5 / 7.5
  CUDA Capability Major/Minor version number:    3.0
  Total amount of global memory:                 2047 MBytes (2146762752 bytes)
  ( 6) Multiprocessors, (192) CUDA Cores/MP:     1152 CUDA Cores
  GPU Max Clock rate:                            1032 MHz (1.03 GHz)
  Memory Clock rate:                             3004 Mhz
  Memory Bus Width:                              256-bit
  L2 Cache Size:                                 524288 bytes
  Maximum Texture Dimension Size (x,y,z)         1D=(65536), 2D=(65536, 65536), 3D=(4096, 4096, 4096)
  Maximum Layered 1D Texture Size, (num) layers  1D=(16384), 2048 layers
  Maximum Layered 2D Texture Size, (num) layers  2D=(16384, 16384), 2048 layers
  Total amount of constant memory:               65536 bytes
  Total amount of shared memory per block:       49152 bytes
  Total number of registers available per block: 65536
  Warp size:                                     32
  Maximum number of threads per multiprocessor:  2048
  Maximum number of threads per block:           1024
  Max dimension size of a thread block (x,y,z): (1024, 1024, 64)
  Max dimension size of a grid size    (x,y,z): (2147483647, 65535, 65535)
  Maximum memory pitch:                          2147483647 bytes
  Texture alignment:                             512 bytes
  Concurrent copy and kernel execution:          Yes with 1 copy engine(s)
  Run time limit on kernels:                     Yes
  Integrated GPU sharing Host Memory:            No
  Support host page-locked memory mapping:       Yes
  Alignment requirement for Surfaces:            Yes
  Device has ECC support:                        Disabled
  Device supports Unified Addressing (UVA):      Yes
  Device PCI Domain ID / Bus ID / location ID:   0 / 3 / 0
  Compute Mode:
     < Default (multiple host threads can use ::cudaSetDevice() with device simultaneously) >

deviceQuery, CUDA Driver = CUDART, CUDA Driver Version = 7.5, CUDA Runtime Version = 7.5, NumDevs = 1, Device0 = GeForce GTX 760
Result = PASS
```

Yeah, I don't have a particularly impressive card in my machine. Luckily I'm not doing any heavy-duty image processing here.

Next, you just download [cuDNN v4](https://developer.nvidia.com/rdp/cudnn-download) and install, adding the contents of the ``lib64`` folder to ``LD_LIBRARY_PATH`` as well.

Now you should be able to run the MNIST example from the TensorFlow tutorials! If, like me, you are running on a less impressive GPU, you may need to pay attention to [this](https://github.com/tensorflow/tensorflow/pull/157). I was getting an out-of-memory error:

```
I tensorflow/core/common_runtime/bfc_allocator.cc:685]      Summary of in-use Chunks by size: 
I tensorflow/core/common_runtime/bfc_allocator.cc:688] 35 Chunks of size 256 totalling 8.8KiB
I tensorflow/core/common_runtime/bfc_allocator.cc:688] 4 Chunks of size 3328 totalling 13.0KiB
I tensorflow/core/common_runtime/bfc_allocator.cc:688] 5 Chunks of size 4096 totalling 20.0KiB
I tensorflow/core/common_runtime/bfc_allocator.cc:688] 3 Chunks of size 31488 totalling 92.2KiB
I tensorflow/core/common_runtime/bfc_allocator.cc:688] 4 Chunks of size 40960 totalling 160.0KiB
I tensorflow/core/common_runtime/bfc_allocator.cc:688] 1 Chunks of size 80128 totalling 78.2KiB
I tensorflow/core/common_runtime/bfc_allocator.cc:688] 4 Chunks of size 204800 totalling 800.0KiB
I tensorflow/core/common_runtime/bfc_allocator.cc:688] 4 Chunks of size 12845056 totalling 49.00MiB
I tensorflow/core/common_runtime/bfc_allocator.cc:688] 1 Chunks of size 31360000 totalling 29.91MiB
I tensorflow/core/common_runtime/bfc_allocator.cc:688] 1 Chunks of size 1393082624 totalling 1.30GiB
I tensorflow/core/common_runtime/bfc_allocator.cc:692] Sum Total of in-use chunks: 1.38GiB
I tensorflow/core/common_runtime/bfc_allocator.cc:694] Stats: 
Limit:                  1490198528
InUse:                  1477023232
MaxInUse:               1477423360
NumAllocs:                 2405088
MaxAllocSize:           1393082624

W tensorflow/core/common_runtime/bfc_allocator.cc:270] **************************************************************************xxxxxxxxxxxxxxxxxxxxxxxxxx
W tensorflow/core/common_runtime/bfc_allocator.cc:271] Ran out of memory trying to allocate 29.91MiB.  See logs for memory state.
W tensorflow/core/framework/op_kernel.cc:900] Resource exhausted: OOM when allocating tensor with shape[10000,1,28,28]
Traceback (most recent call last):
  File "./scripts/mnist.py", line 167, in <module>
    x: mnist.test.images, y_: mnist.test.labels, keep_prob: 1.0}))
  File "/usr/local/lib/python2.7/dist-packages/tensorflow/python/framework/ops.py", line 502, in eval
    return _eval_using_default_session(self, feed_dict, self.graph, session)
  File "/usr/local/lib/python2.7/dist-packages/tensorflow/python/framework/ops.py", line 3334, in _eval_using_default_session
    return session.run(tensors, feed_dict)
  File "/usr/local/lib/python2.7/dist-packages/tensorflow/python/client/session.py", line 340, in run
    run_metadata_ptr)
  File "/usr/local/lib/python2.7/dist-packages/tensorflow/python/client/session.py", line 564, in _run
    feed_dict_string, options, run_metadata)
  File "/usr/local/lib/python2.7/dist-packages/tensorflow/python/client/session.py", line 637, in _do_run
    target_list, options, run_metadata)
  File "/usr/local/lib/python2.7/dist-packages/tensorflow/python/client/session.py", line 659, in _do_call
    e.code)
tensorflow.python.framework.errors.ResourceExhaustedError: OOM when allocating tensor with shape[10000,1,28,28]
	 [[Node: Conv2D = Conv2D[T=DT_FLOAT, data_format="NHWC", padding="SAME", strides=[1, 1, 1, 1], use_cudnn_on_gpu=true, _device="/job:localhost/replica:0/task:0/gpu:0"](Reshape, Variable_2/read)]]
	 [[Node: Mean_3/_1035 = _Recv[client_terminated=false, recv_device="/job:localhost/replica:0/task:0/cpu:0", send_device="/job:localhost/replica:0/task:0/gpu:0", send_device_incarnation=1, tensor_name="edge_911_Mean_3", tensor_type=DT_FLOAT, _device="/job:localhost/replica:0/task:0/cpu:0"]()]]
Caused by op u'Conv2D', defined at:
  File "./scripts/mnist.py", line 119, in <module>
    h_conv1 = tf.nn.relu(conv2d(x_image, W_conv1) + b_conv1)
  File "./scripts/mnist.py", line 91, in conv2d
    return tf.nn.conv2d(x, W, strides=[1, 1, 1, 1], padding='SAME')
  File "/usr/local/lib/python2.7/dist-packages/tensorflow/python/ops/gen_nn_ops.py", line 295, in conv2d
    data_format=data_format, name=name)
  File "/usr/local/lib/python2.7/dist-packages/tensorflow/python/ops/op_def_library.py", line 655, in apply_op
    op_def=op_def)
  File "/usr/local/lib/python2.7/dist-packages/tensorflow/python/framework/ops.py", line 2154, in create_op
    original_op=self._default_original_op, op_def=op_def)
  File "/usr/local/lib/python2.7/dist-packages/tensorflow/python/framework/ops.py", line 1154, in __init__
    self._traceback = _extract_stack()
```

This is because the GPU can't allocate enough space for the entire test set. Unfortunately the basic tutorials [here](https://www.tensorflow.org/versions/r0.8/tutorials/mnist/pros/index.html#f1) do not mention this at present. Easy fix, though: just test in batches.

