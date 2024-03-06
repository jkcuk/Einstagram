# Einstagram
by Gordon Wells, YiChen Wu, Maik Locher, and Johannes Courtial, with thanks to Richard Bowman<br>
_School of Physics & Astronomy, University of Glasgow_

**Web app**: <href url="https://jkcuk.github.io/Einstagram/">https://jkcuk.github.io/Einstagram/</href>

Interactive simulation of the <a href="https://en.wikipedia.org/wiki/Relativistic_aberration">relativistic distortion</a> using the lookalike-sphere construction.   

The relativistic distortion is the change in direction in which objects in motion relative to the observer are seen.  The wavelength shift associated with the <a href="https://en.wikipedia.org/wiki/Relativistic_Doppler_effect">(relativistic) Doppler effect</a> and the change in intensity due to the <a href="https://en.wikipedia.org/wiki/Relativistic_beaming">headlight effect</a> are not simulated.

**β** = (β<sub>x</sub>, β<sub>y</sub>, β<sub>z</sub>) is the simulated velocity of the viewer, in units of _c_ (the speed of light), relative to the scene, which is assumed to be at rest. The (left-handed) coordinate system is defined such that _x_ points to the right, _y_ upwards, and _z_ into the screen.

The **lookalike-sphere construction** projects the view onto a sphere that is centred on the observer and then distorts and translates this sphere such that the view from the centre of the undistorted and undisplaced sphere becomes the relativistically distorted view.  The distorted lookalike sphere can be visualised by setting "Camera position" to "Outside lookalike sphere".  To help with orientation, the part of the forward-facing hemisphere of the lookalike sphere surrounding the environment-facing camera image is coloured white (like bicycle headlights), the rear-facing hemisphere surrounding the user-facing camera image is coloured red (like rear lights).


_Loo![Screenshot_20240306-161205](https://github.com/jkcuk/Einstagram/assets/44874423/c7f95514-6092-413c-949b-026289082481)
kalike sphere.  The image projected into the centre of the white hemisphere is a frame from the video feed from the device's environment-facing camera, ..._

![Screenshot_20240306-161220](https://github.com/jkcuk/Einstagram/assets/44874423/d7e7d967-3867-422c-bd58-e7d34953e20d)
_... the image projected into the centre of the red hemisphere is from the user-facing camera's video feed._

![Screenshot_20240306-161256](https://github.com/jkcuk/Einstagram/assets/44874423/8f58fd56-50b6-42c6-8533-f2926483e835)
_From the centre of the lookalike sphere, and looking in the direction of the white hemisphere, the inside of the lookalike sphere looks like the undistorted video feed from the environment-facing camera.  The video feed from the user-facing camera can be seen in the opposite direction._

_![Screenshot_20240306-161520](https://github.com/jkcuk/Einstagram/assets/44874423/fa8d7610-84bc-4be0-a441-d9aa926dac6d)
Distorted lookalike sphere, seen from outside..._

![Screenshot_20240306-161359](https://github.com/jkcuk/Einstagram/assets/44874423/3a1c56d9-0af4-4896-be24-5fd7bc9f952c)
_... and from inside.  This is the relativistically distorted view for a camera moving with velocity **β**_c_ in the scene (which is assumed to be at rest)._

In addition to purely relativistic effects, the relativistic distortion takes into account **time-of-flight effects**.  The distortion due to time-of-flight effects alone can be simulated by setting "Transformation" to "Galileo"; it corresponds to a pure translation of the lookalike sphere.

**A few details**

For the simulation to be correct, the FOV of the (user-facing and environment-facing) device cameras must be set correctly. The value entered is the wider angle of view, in degrees.

The FOV of the screen represents the angle, in degrees, subtended by the screen from the viewer's position.  Changing it effectively zooms in and out of the view without affecting the distortion.

Some devices have only a single camera, and other devices do not allow simultaneous video streaming from both cameras.  The behaviour is then device- and browser-dependent.
