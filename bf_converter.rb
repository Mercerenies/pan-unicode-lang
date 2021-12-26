#!/usr/bin/ruby
# coding: utf-8

# The following program takes a brainf**k program and converts it to
# an equivalent Pancode program. Provide input on STDIN.

class Converter
  attr_reader :string, :index

  def initialize(string)
    @string = string
    @index = 0
  end

  def current
    string[index]
  end

  def advance
    @index += 1
  end

  def at_end?
    index >= string.length
  end

  private def convert_once
    case current
    when '.' then ':ℓ💬.'
    when ',' then '📜💬0n'
    when '+' then '1+'
    when '-' then '1- '
    when '<' then '@②∷@:🗋[0][:0n[1⧏]D]i'
    when '>' then '@∷@:🗋[0][:0n[1⧏]D]i[@]D'
    when ']' then return nil
    when '['
      advance
      inside = convert_seq
      raise "Expecting ]" unless current == ']'
      "[:][#{inside}]w"
    else
      # Comment; ignore it
      ""
    end.tap { advance }
  end

  private def convert_seq
    s = ""
    until at_end?
      curr = convert_once
      break if curr.nil?
      s += curr
    end
    s
  end

  def convert
    convert_seq.tap {
      raise "Unexpected ]" unless at_end?
    }
  end

end

def convert(s)
  Converter.new(s).convert
end

puts("{}{}0 " + convert(ARGF.read))

