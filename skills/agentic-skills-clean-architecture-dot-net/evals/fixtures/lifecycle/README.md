# Invoice numbering

One deployment currently ships Billing and Import. Both construct invoice numbers
as year plus a zero-padded sequence. The published invoice-number shape must stay
unchanged. No document assigns the number policy to a module. No database split
or code refactor is currently authorized. There are no executed enforcement checks.
