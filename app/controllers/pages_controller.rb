class PagesController < ApplicationController
  def home
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

	  speak "Bonjour, je m'appel Trevor, caisse que je peux faire pour vous ?"  
  end
 def httprequest
 	require "net/http"
 	require "uri"
 	uri = URI.parse('http://hd1.freebox.fr/pub/remote_control')
 	Net::HTTP.post_form( uri, {'code' => '73098161', 'key' => '1'} )
 end
#
end
