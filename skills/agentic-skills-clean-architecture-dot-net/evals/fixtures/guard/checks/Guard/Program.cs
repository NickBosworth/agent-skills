var projects = Projects.Load(args.Single());
Console.WriteLine($"Inspected {projects.Count} semantic compilations.");
return 0;
