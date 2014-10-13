class MeteosController < ApplicationController

	def j0

		@meteo = Meteo.new
		speak 'Il fait actuellement'
		speak @meteo.temperature[1] 
		speak 'degrès sur Agen'

	end

	load 'operating_system.rb'
 
	def speak(text)
	  if OperatingSystem.windows?
	    require 'win32/sapi5'
	    v = Win32::SpVoice.new
	    v.Speak(text)
	  elsif OperatingSystem.mac?
	    IO.popen(["say"], "w") {|pipe| pipe.puts text}
	  else
	    # Try to run "espeak". No OperatingSystem check: "espeak" is
	    # for Linux but is also an optional package for BSD.
	    IO.popen(["espeak", "-stdin"], "w") {|pipe| pipe.puts text}
	  end
	end

end
