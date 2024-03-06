# Relativistic Distortionist
by Gordon Wells, YiChen Wu, Maik Locher, and Johannes Courtial, with thanks to Richard Bowman<br>
_School of Physics & Astronomy, University of Glasgow_

Interactive simulation of the <a href="https://en.wikipedia.org/wiki/Relativistic_aberration">relativistic distortion</a> using the lookalike-sphere construction.   

The relativistic distortion is the change in direction in which objects in motion relative to the observer are seen.  The wavelength shift associated with the <a href="https://en.wikipedia.org/wiki/Relativistic_Doppler_effect">(relativistic) Doppler effect</a> and the change in intensity due to the <a href="https://en.wikipedia.org/wiki/Relativistic_beaming">headlight effect</a> are not simulated.

**β** = (β<sub>x</sub>, β<sub>y</sub>, β<sub>z</sub>) is the simulated velocity of the viewer, in units of _c_, the speed of light. The (left-handed) coordinate system is defined such that _x_ points to the right, _y_ upwards, and _z_ into the screen.

The lookalike-sphere construction projects the view onto a sphere that is centred on the observer and then distorts and translates this sphere such that the view from the centre of the undistorted and undisplaced sphere becomes the relativistically distorted view.  The distorted lookalike sphere can be visualised by setting "Camera position" to "Outside lookalike sphere".  To help with orientation, the part of the forward-facing hemisphere of the lookalike sphere surrounding the environment-facing camera image is coloured white (like bicycle headlights), the  rear-facing hemisphere surrounding the user-facing camera image is coloured red (like rear lights).

In addition to purely relativistic effects, the relativistic distortion takes into account time-of-flight effects.  The distortion due to time-of-flight effects alone can be simulated by setting "Transformation" to "Galileo"; it corresponds to a pure translation of the lookalike sphere.

For the simulation to be correct, the FOV of the (user-facing and environment-facing) device cameras must be set correctly. The value entered is the wider angle of view, in degrees.

The FOV of the screen represents the angle, in degrees, subtended by the screen from the viewer's position.  Changing it effectively zooms in and out of the view without affecting the distortion.

The finished product is at <href url="https://jkcuk.github.io/relativisticDistortionist/">https://jkcuk.github.io/relativisticDistortionist/</href>.
